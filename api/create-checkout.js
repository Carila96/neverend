// api/create-checkout.js — POST /api/create-checkout
// Validates a reservation session, calculates price, and creates a Stripe Checkout session.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Volume discount tiers (spec §4.3)
function getVolumeDiscount(blockCount) {
  if (blockCount >= 250) return 0.30;
  if (blockCount >= 100) return 0.20;
  if (blockCount >= 25)  return 0.10;
  return 0;
}

// Returns total amount in cents
// Monthly: 1 month; Annual: 10 months billed upfront (spec §4.4)
function calcAmountCents(blockCount, planType, pricePerBlock = 3) {
  const discount = getVolumeDiscount(blockCount);
  const discountedPrice = pricePerBlock * (1 - discount);
  const months = planType === 'annual' ? 10 : 1;
  return Math.round(discountedPrice * blockCount * months * 100);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_key } = req.body;
  if (!session_key) return res.status(400).json({ error: 'Missing session_key' });

  // Look up reservation session
  const { data: session, error } = await supabase
    .from('reservation_sessions')
    .select('*')
    .eq('session_key', session_key)
    .eq('status', 'pending')
    .single();

  if (error || !session) return res.status(404).json({ error: 'Reservation session not found or already used' });

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('reservation_sessions').update({ status: 'expired' }).eq('session_key', session_key);
    return res.status(410).json({ error: 'Reservation session has expired — please start over' });
  }

  const { block_count, plan_type, zone_type, stage_id, anchor_x, anchor_y, width, height } = session;
  const amountCents = calcAmountCents(block_count, plan_type);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const isSubscription = plan_type === 'monthly';

  const lineItem = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: `neverEND Grid — Stage ${stage_id} (${width}×${height} blocks)`,
        description: `${block_count} block${block_count > 1 ? 's' : ''} at (${anchor_x}, ${anchor_y}) — ${zone_type} zone, ${plan_type} plan`,
      },
      unit_amount: amountCents,
      ...(isSubscription && { recurring: { interval: 'month' } }),
    },
    quantity: 1,
  };

  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: 'https://neverend.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://neverend.vercel.app/cancel',
      metadata: {
        session_key,
        stage_id: String(stage_id),
        anchor_x: String(anchor_x),
        anchor_y: String(anchor_y),
        width: String(width),
        height: String(height),
        block_count: String(block_count),
        plan_type,
        zone_type,
      },
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: 'Failed to create Stripe checkout session' });
  }

  // Store Stripe session ID on reservation session
  await supabase
    .from('reservation_sessions')
    .update({ stripe_session_id: stripeSession.id })
    .eq('session_key', session_key);

  return res.status(200).json({ url: stripeSession.url, stripe_session_id: stripeSession.id });
}
