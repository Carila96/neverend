// api/webhook.js — POST /api/webhook
// Handles Stripe webhook events. Raw body required for signature verification.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false }, // Must receive raw body for Stripe signature check
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Event handlers ──────────────────────────────────────────────────────────

// checkout.session.completed: payment collected → claim blocks, create contract
async function handleCheckoutCompleted(session) {
  const { session_key, stage_id, anchor_x, anchor_y, width, height, block_count, plan_type, zone_type } =
    session.metadata;

  // Look up reservation session
  const { data: reservation } = await supabase
    .from('reservation_sessions')
    .select('*')
    .eq('session_key', session_key)
    .single();

  if (!reservation) throw new Error(`No reservation session for session_key=${session_key}`);

  // Claim the blocks
  const ax = parseInt(anchor_x, 10);
  const ay = parseInt(anchor_y, 10);
  const w  = parseInt(width, 10);
  const h  = parseInt(height, 10);

  const { error: claimError } = await supabase
    .from('owned_blocks')
    .update({ status: 'claimed', claimed_at: new Date().toISOString(), expires_at: null })
    .eq('stage_id', parseInt(stage_id, 10))
    .eq('status', 'reserved')
    .gte('x', ax).lt('x', ax + w)
    .gte('y', ay).lt('y', ay + h);

  if (claimError) throw new Error(`Failed to claim blocks: ${claimError.message}`);

  // Create subscription contract
  const contractPayload = {
    plan_type,
    zone_type,
    block_count: parseInt(block_count, 10),
    status: 'active',
    stripe_session_id: session.id,
    stripe_customer_id: session.customer ?? null,
    base_price_usd: 3.00, // launch price; update when price ladder advances
    monthly_total_usd: parseFloat((session.amount_total / 100).toFixed(2)),
    current_period_start: new Date().toISOString(),
  };

  // Attach subscription ID for monthly plans
  if (session.subscription) {
    contractPayload.stripe_subscription_id = session.subscription;
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    contractPayload.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
  }

  const { data: contract, error: contractError } = await supabase
    .from('subscription_contracts')
    .insert(contractPayload)
    .select('id')
    .single();

  if (contractError) throw new Error(`Failed to create contract: ${contractError.message}`);

  // Link blocks to contract
  await supabase
    .from('owned_blocks')
    .update({ contract_id: contract.id })
    .eq('stage_id', parseInt(stage_id, 10))
    .gte('x', ax).lt('x', ax + w)
    .gte('y', ay).lt('y', ay + h);

  // Mark reservation session completed
  await supabase
    .from('reservation_sessions')
    .update({ status: 'completed' })
    .eq('session_key', session_key);
}

// customer.subscription.deleted: user cancelled → release blocks, update contract
async function handleSubscriptionDeleted(subscription) {
  const { data: contract } = await supabase
    .from('subscription_contracts')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!contract) return; // already cleaned up or not found

  await supabase
    .from('subscription_contracts')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', contract.id);

  await supabase
    .from('owned_blocks')
    .update({ status: 'released' })
    .eq('contract_id', contract.id);
}

// invoice.payment_failed: mark contract past_due
async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  await supabase
    .from('subscription_contracts')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);
}

// invoice.payment_succeeded: recover from past_due after successful retry
async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const sub = await stripe.subscriptions.retrieve(invoice.subscription);

  await supabase
    .from('subscription_contracts')
    .update({
      status: 'active',
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription)
    .eq('status', 'past_due'); // only recover if it was past_due, not for first payment
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing Stripe signature' });

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing?.processed) return res.status(200).json({ received: true, skipped: true });

  // Log event before processing
  await supabase.from('stripe_webhook_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed: false,
    payload: event,
  }, { onConflict: 'stripe_event_id' });

  let processError = null;
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      default:
        // Unhandled event types — acknowledged, not processed
        break;
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err.message);
    processError = err.message;
  }

  // Update log with result
  await supabase
    .from('stripe_webhook_events')
    .update({ processed: !processError, error: processError ?? null })
    .eq('stripe_event_id', event.id);

  if (processError) return res.status(500).json({ error: processError });
  return res.status(200).json({ received: true });
}
