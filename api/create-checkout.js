// api/create-checkout.js — POST /api/create-checkout
// Dual diagnostic: creates both a subscription and a payment session to isolate
// "Something went wrong" on Stripe Checkout.
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

async function createAndLog(label, params) {
  console.log(`\n=== ${label} PARAMS ===`);
  console.log(JSON.stringify(params, null, 2));
  const session = await stripe.checkout.sessions.create(params);
  console.log(`=== ${label} SESSION CREATED ===`);
  console.log(JSON.stringify({ id: session.id, status: session.status, mode: session.mode, livemode: session.livemode, url: session.url }, null, 2));
  const retrieved = await stripe.checkout.sessions.retrieve(session.id);
  console.log(`=== ${label} RETRIEVED ===`);
  console.log(JSON.stringify({ id: retrieved.id, status: retrieved.status, mode: retrieved.mode, livemode: retrieved.livemode, url: retrieved.url }, null, 2));
  return session;
}

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

  const { block_count, plan_type } = reservation;
  const amountCents = calcAmountCents(block_count, plan_type);

  console.log("=== CREATE CHECKOUT DIAGNOSTIC START ===");
  console.log("STRIPE_SECRET_KEY prefix:", process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.slice(0, 7) : "missing");
  console.log("amount_cents:", amountCents, "block_count:", block_count, "plan_type:", plan_type);

  const SUCCESS_URL = 'https://neverend.vercel.app/success?session_id={CHECKOUT_SESSION_ID}';
  const CANCEL_URL  = 'https://neverend.vercel.app/cancel';

  try {
    // ── Session A: subscription (simplified) ──
    const subParams = {
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
      success_url: SUCCESS_URL,
      cancel_url:  CANCEL_URL,
    };
    const subSession = await createAndLog('SUBSCRIPTION', subParams);

    // ── Session B: one-time payment (no recurring) ──
    const payParams = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'neverEND Grid Placement (one-time)' },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: SUCCESS_URL,
      cancel_url:  CANCEL_URL,
    };
    const paySession = await createAndLog('PAYMENT', payParams);

    // Store subscription session ID on reservation
    await supabase
      .from('reservation_sessions')
      .update({ stripe_session_id: subSession.id })
      .eq('session_key', session_key);

    return res.status(200).json({
      subscription_url: subSession.url,
      payment_url:      paySession.url,
      subscription_id:  subSession.id,
      payment_id:       paySession.id,
      livemode:         subSession.livemode,
    });

  } catch (error) {
    console.error("STRIPE ERROR:", error);
    return res.status(500).json({ error: error.message, type: error.type || null, code: error.code || null });
  }
}
