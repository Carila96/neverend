// api/create-checkout.js — POST /api/create-checkout
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getVolumeDiscount(blockCount) {
  if (blockCount >= 250) return 0.30;
  if (blockCount >= 100) return 0.20;
  if (blockCount >= 25)  return 0.10;
  return 0;
}

function calcAmountCents(blockCount, planType, pricePerBlock = 3) {
  const discount = getVolumeDiscount(blockCount);
  const discountedPrice = pricePerBlock * (1 - discount);
  const months = planType === 'annual' ? 10 : 1;
  return Math.round(discountedPrice * blockCount * months * 100);
}

const BASE_URL = 'https://neverend.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_key } = req.body;
  if (!session_key) return res.status(400).json({ error: 'Missing session_key' });

  const { data: reservation, error } = await supabase
    .from('reservation_sessions')
    .select('*')
    .eq('session_key', session_key)
    .eq('status', 'pending')
    .single();

  if (error || !reservation) return res.status(404).json({ error: 'Reservation session not found or already used' });

  if (new Date(reservation.expires_at) < new Date()) {
    await supabase.from('reservation_sessions').update({ status: 'expired' }).eq('session_key', session_key);
    return res.status(410).json({ error: 'Reservation session has expired — please start over' });
  }

  const { block_count, plan_type, stage_id, anchor_x, anchor_y, width, height, zone_type } = reservation;
  const amountCents = calcAmountCents(block_count, plan_type);

  console.log('=== CREATE CHECKOUT ===');
  console.log('session_key:', session_key, 'plan_type:', plan_type, 'block_count:', block_count, 'amount_cents:', amountCents);

  // metadata required by webhook to identify and process the reservation
  const metadata = {
    session_key,
    stage_id:  String(stage_id),
    anchor_x:  String(anchor_x),
    anchor_y:  String(anchor_y),
    width:     String(width),
    height:    String(height),
    block_count: String(block_count),
    plan_type,
    zone_type,
  };

  try {
    let sessionParams;

    if (plan_type === 'monthly') {
      // Recurring subscription
      sessionParams = {
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'neverEND Grid Placement' },
            unit_amount: amountCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        subscription_data: { metadata },
        metadata,
        success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/cancel.html`,
      };
    } else {
      // Annual = one-time payment (10 months upfront)
      sessionParams = {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'neverEND Grid Placement (Annual)' },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        metadata,
        success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/cancel.html`,
      };
    }

    console.log('SESSION PARAMS:', JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('SESSION CREATED:', session.id, 'livemode:', session.livemode, 'url:', session.url);

    // Store stripe session ID on reservation
    await supabase
      .from('reservation_sessions')
      .update({ stripe_session_id: session.id })
      .eq('session_key', session_key);

    return res.status(200).json({
      url:        session.url,
      session_id: session.id,
      livemode:   session.livemode,
    });

  } catch (err) {
    console.error('STRIPE ERROR:', err);
    return res.status(500).json({ error: err.message, type: err.type || null, code: err.code || null });
  }
}
