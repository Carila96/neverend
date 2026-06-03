import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { session_key, contract_id } = req.body;

  // --- 契約キャンセル（contract_idあり）---
  if (contract_id) {
    try {
      const { data: contract, error } = await supabase
        .from('subscription_contracts')
        .select('id, stripe_subscription_id, status')
        .eq('id', contract_id)
        .maybeSingle();

      if (error || !contract) return res.status(404).json({ error: 'Contract not found' });
      if (contract.status === 'canceled') return res.status(400).json({ error: 'Already canceled' });

      // Stripeサブスクリプションをキャンセル
      if (contract.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(contract.stripe_subscription_id);
        } catch (stripeErr) {
          console.warn('Stripe cancel error:', stripeErr.message);
        }
      }

      // subscription_contractsをcanceledに更新
      await supabase
        .from('subscription_contracts')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', contract_id);

      // owned_blocksをreleasedに更新
      await supabase
        .from('owned_blocks')
        .update({ status: 'released' })
        .eq('contract_id', contract_id);

      // placementsをis_active=falseに更新
      await supabase
        .from('placements')
        .update({ is_active: false })
        .eq('contract_id', contract_id);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- 予約キャンセル（session_keyあり）---
  if (!session_key) return res.status(400).json({ error: 'Missing session_key or contract_id' });

  try {
    const { data: session } = await supabase
      .from('reservation_sessions')
      .select('*')
      .eq('session_key', session_key)
      .maybeSingle();

    if (session) {
      await supabase
        .from('owned_blocks')
        .delete()
        .eq('stage_id', session.stage_id)
        .eq('status', 'reserved')
        .gte('x', session.anchor_x)
        .lte('x', session.anchor_x + session.width - 1)
        .gte('y', session.anchor_y)
        .lte('y', session.anchor_y + session.height - 1);

      await supabase
        .from('reservation_sessions')
        .update({ status: 'expired' })
        .eq('session_key', session_key);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
