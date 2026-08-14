import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ★修正D: Authorization: Bearer <supabase access token> を検証してユーザーを得る。
//   このAPIはサービスロールキーで動くため RLS が効かない。所有者確認はここでやるしかない。
//   失敗時は res を書いて null を返す（呼び出し側は null なら即 return）。
async function requireUser(req, res) {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }
  return data.user;
}

// ★修正D: 契約を取得し、呼び出し元が所有者であることを確認する。
//   「存在しない」と「他人のもの」を区別せず、どちらも 404 で返す。
//   403 と 404 を返し分けると契約IDの存在有無が判別でき、総当たりで実在IDを
//   列挙できてしまうため。所有者にとっては挙動が変わらないので不便も無い。
async function loadOwnedContract(contractId, userId, columns) {
  const { data, error } = await supabase
    .from('subscription_contracts')
    .select(columns)
    .eq('id', contractId)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.user_id || data.user_id !== userId) return null;
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { session_key, contract_id } = req.body;

  // --- 位置変更（action==='update_position'の場合）---
  const { action, new_anchor_x, new_anchor_y } = req.body;
  if (contract_id && action === 'update_position') {
    try {
      // ★修正D: 所有者確認。他人の枠を動かせないようにする。
      const user = await requireUser(req, res);
      if (!user) return;
      const contract = await loadOwnedContract(
        contract_id, user.id, 'id, user_id, stage_id, anchor_x, anchor_y, width, height, status');
      if (!contract) return res.status(404).json({ error: 'Contract not found' });
      if (contract.status === 'canceled') return res.status(400).json({ error: 'Contract is canceled' });

      const nx = parseInt(new_anchor_x, 10);
      const ny = parseInt(new_anchor_y, 10);
      const w = contract.width;
      const h = contract.height;
      const stageId = contract.stage_id;

      // 新しい位置のブロックが他ユーザーにclaimedされていないか確認
      const { data: conflictBlocks } = await supabase
        .from('owned_blocks')
        .select('id')
        .eq('stage_id', stageId)
        .eq('status', 'claimed')
        .neq('contract_id', contract_id)
        .gte('x', nx)
        .lte('x', nx + w - 1)
        .gte('y', ny)
        .lte('y', ny + h - 1)
        .limit(1);

      if (conflictBlocks && conflictBlocks.length > 0) {
        return res.status(409).json({ error: 'Position is already taken' });
      }

      // 古いブロックを削除（releaseではなくdelete）
      await supabase
        .from('owned_blocks')
        .delete()
        .eq('contract_id', contract_id);

      // 新しいブロックをclaimed状態でinsert
      const newBlocks = [];
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          newBlocks.push({
            contract_id,
            stage_id: stageId,
            x: nx + dx,
            y: ny + dy,
            status: 'claimed',
            claimed_at: new Date().toISOString()
          });
        }
      }
      const { error: insertError } = await supabase.from('owned_blocks').insert(newBlocks);
      if(insertError){
        console.error('owned_blocks insert error:', insertError);
        return res.status(500).json({ error: 'Failed to update block positions: ' + insertError.message });
      }

      // subscription_contractsのanchor_x/anchor_yを更新
      await supabase
        .from('subscription_contracts')
        .update({ anchor_x: nx, anchor_y: ny })
        .eq('id', contract_id);

      // placementsのanchor_x/anchor_yを更新
      await supabase
        .from('placements')
        .update({ anchor_x: nx, anchor_y: ny })
        .eq('contract_id', contract_id);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- 契約キャンセル（contract_idあり）---
  if (contract_id) {
    try {
      // ★修正D: 所有者確認。他人の契約を解約できないようにする。
      const user = await requireUser(req, res);
      if (!user) return;
      const contract = await loadOwnedContract(
        contract_id, user.id, 'id, user_id, stripe_subscription_id, status');
      if (!contract) return res.status(404).json({ error: 'Contract not found' });
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
