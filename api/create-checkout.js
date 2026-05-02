// api/create-checkout.js — POST /api/create-checkout
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BASE_URL = 'https://neverend.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_key, admin_key } = req.body;
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

  const { block_count, plan_type, stage_id, anchor_x, anchor_y, width, height, zone_type, monthly_total } = reservation;

  // Admin free placement — skip Stripe, claim blocks directly
  if (admin_key) {
    if (admin_key !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    await supabase.from('owned_blocks')
      .update({ status: 'claimed', expires_at: null })
      .eq('stage_id', stage_id)
      .gte('x', anchor_x).lt('x', anchor_x + width)
      .gte('y', anchor_y).lt('y', anchor_y + height)
      .eq('status', 'reserved');
    await supabase.from('reservation_sessions')
      .update({ status: 'completed' })
      .eq('session_key', session_key);
    return res.status(200).json({ ok: true, admin: true });
  }

  // Use monthly_total stored in reservation (calculated at reserve time from live price tier)
  // Annual = 10 months upfront
  const amountCents = plan_type === 'annual'
    ? Math.round((monthly_total || 1) * 10 * 100)
    : Math.round((monthly_total || 1) * 100);

  const metadata = {
    session_key,
    stage_id:    String(stage_id),
    anchor_x:    String(anchor_x),
    anchor_y:    String(anchor_y),
    width:       String(width),
    height:      String(height),
    block_count: String(block_count),
    plan_type,
    zone_type,
  };

  try {
    let sessionParams;

    if (plan_type === 'monthly') {
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
        success_url: `${BASE_URL}/app/pages/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/app/pages/cancel.html`,
      };
    } else {
      // Annual = one-time payment (10 months upfront)
      sessionParams = {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'neverEND Grid Placement (Annual — 10 months)' },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        metadata,
        success_url: `${BASE_URL}/app/pages/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/app/pages/cancel.html`,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('SESSION CREATED:', session.id, 'amount_cents:', amountCents, 'livemode:', session.livemode);

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
