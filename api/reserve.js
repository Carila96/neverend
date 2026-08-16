// api/reserve.js — POST /api/reserve
// Locks grid blocks for 30 min and creates a reservation session for checkout.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TTL_MINUTES = 30;
// ★修正A: グリッドの実寸。api/grid.js の GRID_COLS / GRID_ROWS と同値。
const GRID_COLS = 128;
const GRID_ROWS = 72;
// ★修正B: 最低請求額(USD)。Math.floor により 1 ドル未満が 0 に潰れるため、
//   0 以下になる注文は成立させない。金額そのものは切り捨てのままにして、
//   「0 円で通る」経路だけを塞ぐ。
const MIN_MONTHLY_TOTAL_USD = 1;

const PRICE_TIERS = [
  { minBlocks: 0,       maxBlocks: 20000,    pricePerBlock: 0.40 },
  { minBlocks: 20001,   maxBlocks: 50000,    pricePerBlock: 0.70 },
  { minBlocks: 50001,   maxBlocks: 90000,    pricePerBlock: 1.10 },
  { minBlocks: 90001,   maxBlocks: 140000,   pricePerBlock: 1.60 },
  { minBlocks: 140001,  maxBlocks: 300000,   pricePerBlock: 2.40 },
  { minBlocks: 300001,  maxBlocks: 800000,   pricePerBlock: 3.10 },
  { minBlocks: 800001,  maxBlocks: Infinity, pricePerBlock: 4.00 },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {

  // ★修正A: active_blocks はリクエストから受け取らない。課金数はサーバーが算出する。
  //   旧実装は active_blocks をそのまま課金数に採用していたため、width×height で面積を
  //   確保しながら active_blocks:1 を送ると請求額が 0 になった（確保面積と課金数が別物だった）。
  const { stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type, deleted_blocks } = req.body;
  // ★追加F: req.body.user_id は信用しない（下でトークンから取得する）。
  if (!stage_id || anchor_x == null || anchor_y == null || !width || !height || !zone_type || !plan_type)
    return res.status(400).json({ error: 'Missing required fields' });

  // ★修正A: width / height の上限。グリッド(GRID_COLS x GRID_ROWS)を超える指定は受け付けない。
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 ||
      width > GRID_COLS || height > GRID_ROWS) {
    return res.status(400).json({ error: 'Invalid size' });
  }
  if (!Number.isInteger(anchor_x) || !Number.isInteger(anchor_y)) {
    return res.status(400).json({ error: 'Invalid anchor' });
  }

  // ★修正A: deleted_blocks を検証する。配列であること / 各要素が width×height の範囲内の
  //   整数座標であること / 重複が無いこと。1 件でも外れていればリクエスト全体を 400 で拒否する。
  //   「無視」ではなく「拒否」を選んだ理由: 無視方式だと不正な要素を混ぜて課金数だけ
  //   減らせる余地が残るため。正規クライアントは範囲内の座標しか送らないので影響しない。
  if (deleted_blocks !== undefined && !Array.isArray(deleted_blocks)) {
    return res.status(400).json({ error: 'deleted_blocks must be an array' });
  }
  const deletedSet = new Set();
  for (const dnode of (Array.isArray(deleted_blocks) ? deleted_blocks : [])) {
    if (!dnode || !Number.isInteger(dnode.x) || !Number.isInteger(dnode.y)) {
      return res.status(400).json({ error: 'deleted_blocks entries must be integer {x,y}' });
    }
    if (dnode.x < 0 || dnode.x >= width || dnode.y < 0 || dnode.y >= height) {
      return res.status(400).json({ error: 'deleted_blocks entry out of placement bounds' });
    }
    const dkey = dnode.x + ',' + dnode.y;
    if (deletedSet.has(dkey)) {
      return res.status(400).json({ error: 'deleted_blocks contains duplicates' });
    }
    deletedSet.add(dkey);
  }

  // 透明マスのはみ出しを許可：Activeピクセルがグリッド内に収まっていればOK
  // anchor_xが負またはanchor_x+widthが128超でも、deleted_blocksで調整済みならOK
  const clampedX = Math.max(0, anchor_x);
  const clampedY = Math.max(0, anchor_y);
  const clampedW = Math.min(anchor_x + width, 128) - clampedX;
  const clampedH = Math.min(anchor_y + height, 72) - clampedY;
  if (clampedW <= 0 || clampedH <= 0)
    return res.status(400).json({ error: "Placement out of grid bounds (128x72)" });

  // ★修正A: 実際に確保するブロックを先に組み立てる。課金数はこの配列の長さ
  //   （blocks.length）だけを使うので、「課金数」と「確保面積」が食い違う経路が
  //   構造的に無くなる。以前は課金数を別計算しており、そこが 0 円購入の入口だった。
  const blocks = [];
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (deletedSet.has(dx + ',' + dy)) continue;
      const bx = anchor_x + dx;
      const by = anchor_y + dy;
      // グリッド範囲外（負の値や上限超）のブロックはスキップ
      if (bx < 0 || bx >= GRID_COLS || by < 0 || by >= GRID_ROWS) continue;
      blocks.push({
        stage_id,
        x: bx,
        y: by,
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        expires_at: null,   // 下で確定した expires_at を入れる
      });
    }
  }
  if (blocks.length === 0) {
    return res.status(400).json({ error: 'No valid blocks to reserve' });
  }
  const block_count = blocks.length;

  // ★追加F: 予約はログイン必須にする。購入フローは元からログイン必須
  //   （sales_page.html のボタンがログインモーダルを出す）だが、API を直接叩けば
  //   user_id: null の予約→契約が作れてしまい、修正D 実施後は所有者が居ないため
  //   誰も解約もロゴ差し替えもできない契約になる。
  //   user_id はクライアントの申告値ではなくトークンから取る（申告値は使わない）。
  //   admin_key による無料配置経路は削除した（共有シークレットを販売ページで
  //   入力させる方式のため、入力時点でブラウザとネットワークに露出していた）。
  //   これによりこの認証チェックを迂回できる経路は無くなった。無料配置が要る場合は
  //   100% OFF クーポン（修正C の許可リスト経由）で行う。
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData || !authData.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const authed_user_id = authData.user.id;

  // Fetch current price tier based on total claimed blocks
  const { count: totalClaimed } = await supabase
    .from('owned_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'claimed');

  const total = totalClaimed || 0;
  const tier = PRICE_TIERS.find(t => total <= t.maxBlocks) || PRICE_TIERS[PRICE_TIERS.length - 1];
  const price_per_block = tier.pricePerBlock;
  let discount = 0;
  if(block_count >= 4609) discount = 0.35;
  else if(block_count >= 1001) discount = 0.30;
  else if(block_count >= 501) discount = 0.20;
  else if(block_count >= 200) discount = 0.10;
  const monthly_total = Math.floor(price_per_block * block_count * (1 - discount));
  // ★修正B: Math.floor により 1 ドル未満が 0 に潰れる。0 以下の予約は成立させない。
  //   最低額を「切り上げる」のではなく「拒否する」のは、意図しない少額課金を作らず、
  //   かつ 0 円で枠を確保できる経路を確実に断つため。最小構成でも 1 ドルには届く
  //   （最安 0.40/ブロックで 3 ブロック以上）ので、正規の購入導線には影響しない。
  if (!Number.isFinite(monthly_total) || monthly_total < MIN_MONTHLY_TOTAL_USD) {
    return res.status(400).json({ error: 'Order total too small' });
  }
  const expires_at = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
  const session_key = randomBytes(32).toString('hex');

  // 期限切れreservedを削除
  await supabase
    .from('owned_blocks')
    .delete()
    .eq('status', 'reserved')
    .lt('expires_at', new Date().toISOString());

  // 同一ユーザーの古いreservedブロックを自動キャンセル（ブラウザを閉じた場合も対応）
  if (authed_user_id) {
    const { data: oldSessions } = await supabase
      .from('reservation_sessions')
      .select('session_key, stage_id, anchor_x, anchor_y, width, height')
      .eq('user_id', authed_user_id)
      .eq('status', 'pending');

    if (oldSessions && oldSessions.length > 0) {
      for (const oldSession of oldSessions) {
        await supabase
          .from('owned_blocks')
          .delete()
          .eq('stage_id', oldSession.stage_id)
          .eq('status', 'reserved')
          .gte('x', oldSession.anchor_x)
          .lte('x', oldSession.anchor_x + oldSession.width - 1)
          .gte('y', oldSession.anchor_y)
          .lte('y', oldSession.anchor_y + oldSession.height - 1);

        await supabase
          .from('reservation_sessions')
          .update({ status: 'expired' })
          .eq('session_key', oldSession.session_key);
      }
    }
  }

  // Check for conflicts — exclude expired reserved blocks
  const { data: rawConflicts } = await supabase
    .from('owned_blocks')
    .select('x,y,status,expires_at')
    .eq('stage_id', stage_id)
    .in('status', ['claimed', 'reserved'])
    .gte('x', anchor_x).lt('x', anchor_x + width)
    .gte('y', anchor_y).lt('y', anchor_y + height);

  const now = new Date().toISOString();
  const conflicts = (rawConflicts || []).filter(b => {
    if (deletedSet.has(`${b.x - anchor_x},${b.y - anchor_y}`)) return false;
    return b.status === 'claimed' || (b.status === 'reserved' && b.expires_at && b.expires_at > now);
  });

  if (conflicts.length > 0)
    return res.status(409).json({
      error: 'Placement conflict',
      message: 'Cannot place here — overlaps claimed or reserved blocks',
      conflicts: conflicts.map(b => ({ x: b.x, y: b.y, status: b.status })),
    });

  // ★修正A: ブロック配列は上で組み立て済み（課金数 block_count = blocks.length と同一物）。
  //   ここでは期限だけを入れる。二重に組み立てないので、課金数と確保数がずれ得ない。
  for (const blk of blocks) blk.expires_at = expires_at;

  const { error: insertError } = await supabase.from('owned_blocks').insert(blocks);
  if (insertError) {
    console.error('owned_blocks insert error:', JSON.stringify(insertError));
    if (insertError.code === '23505')
      return res.status(409).json({ error: 'Placement conflict', message: 'These blocks were just claimed by another user.' });
    return res.status(500).json({ error: 'Failed to reserve blocks', detail: insertError.message });
  }

  const { error: sessionError } = await supabase.from('reservation_sessions').insert({
    session_key,
    user_id: authed_user_id,
    stage_id,
    anchor_x: clampedX,
    anchor_y: clampedY,
    width: clampedW,
    height: clampedH,
    zone_type,
    plan_type,
    block_count,
    active_blocks: blocks.length,
    price_per_block,
    monthly_total,
    expires_at,
    status: 'pending',
  });

  if (sessionError) {
    console.error('session insert error:', JSON.stringify(sessionError));
    return res.status(500).json({ error: 'Failed to create reservation session', detail: sessionError.message });
  }

  return res.status(200).json({ session_key, expires_at, block_count, price_per_block, monthly_total });
  } catch (e) {
    console.error('reserve error:', e);
    return res.status(500).json({ error: 'Internal server error', detail: e.message });
  }
}
