// api/reserve.js — POST /api/reserve
// Locks grid blocks for 30 min and creates a reservation session for checkout.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TTL_MINUTES = 30;

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

  const { stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type, admin_key, deleted_blocks, active_blocks } = req.body;
  const user_id = req.body.user_id || null;
  if (!stage_id || anchor_x == null || anchor_y == null || !width || !height || !zone_type || !plan_type)
    return res.status(400).json({ error: 'Missing required fields' });
  const deletedSet = new Set((Array.isArray(deleted_blocks) ? deleted_blocks : []).map(d => `${d.x},${d.y}`));

  // 透明マスのはみ出しを許可：Activeピクセルがグリッド内に収まっていればOK
  // anchor_xが負またはanchor_x+widthが128超でも、deleted_blocksで調整済みならOK
  const clampedX = Math.max(0, anchor_x);
  const clampedY = Math.max(0, anchor_y);
  const clampedW = Math.min(anchor_x + width, 128) - clampedX;
  const clampedH = Math.min(anchor_y + height, 72) - clampedY;
  if (clampedW <= 0 || clampedH <= 0)
    return res.status(400).json({ error: "Placement out of grid bounds (128x72)" });

  const block_count = (active_blocks && active_blocks > 0)
    ? active_blocks
    : Math.max(1, (width * height) - (deleted_blocks ? deleted_blocks.length : 0));

  // Admin free placement — bypass conflict check, insert directly as claimed
  if (admin_key) {
    if (admin_key !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    const adminBlocks = [];
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++)
        adminBlocks.push({
          stage_id,
          x: anchor_x + dx,
          y: anchor_y + dy,
          status: 'claimed',
          reserved_at: new Date().toISOString(),
        });
    const { error: adminErr } = await supabase.from('owned_blocks').insert(adminBlocks);
    if (adminErr) {
      if (adminErr.code === '23505')
        return res.status(409).json({ error: 'Conflict', message: 'Some blocks already claimed.' });
      return res.status(500).json({ error: 'Failed to place admin blocks', detail: adminErr.message });
    }
    return res.status(200).json({ ok: true, admin: true, block_count, stage_id, anchor_x, anchor_y, width, height });
  }

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
  const expires_at = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
  const session_key = randomBytes(32).toString('hex');

  // 期限切れreservedを削除
  await supabase
    .from('owned_blocks')
    .delete()
    .eq('status', 'reserved')
    .lt('expires_at', new Date().toISOString());

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

  // Insert one row per block as reserved (skip deleted_blocks)
  const blocks = [];
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (deletedSet.has(`${dx},${dy}`)) continue;
      const bx = anchor_x + dx;
      const by = anchor_y + dy;
      // グリッド範囲外（負の値や128/72超）のブロックはスキップ
      if (bx < 0 || bx >= 128 || by < 0 || by >= 72) continue;
      blocks.push({
        stage_id,
        x: bx,
        y: by,
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        expires_at,
      });
    }
  }

  if (blocks.length === 0) {
    return res.status(400).json({ error: 'No valid blocks to reserve' });
  }

  const { error: insertError } = await supabase.from('owned_blocks').insert(blocks);
  if (insertError) {
    console.error('owned_blocks insert error:', JSON.stringify(insertError));
    if (insertError.code === '23505')
      return res.status(409).json({ error: 'Placement conflict', message: 'These blocks were just claimed by another user.' });
    return res.status(500).json({ error: 'Failed to reserve blocks', detail: insertError.message });
  }

  const { error: sessionError } = await supabase.from('reservation_sessions').insert({
    session_key,
    user_id,
    stage_id,
    anchor_x,
    anchor_y,
    width,
    height,
    zone_type,
    plan_type,
    block_count,
    price_per_block,
    monthly_total,
    expires_at,
    status: 'pending',
  });

  if (sessionError) {
    console.error('session insert error:', sessionError);
    await supabase.from('owned_blocks')
      .delete()
      .eq('stage_id', stage_id)
      .gte('x', anchor_x).lt('x', anchor_x + width)
      .gte('y', anchor_y).lt('y', anchor_y + height)
      .eq('status', 'reserved');
    return res.status(500).json({ error: 'Failed to create reservation session' });
  }

  return res.status(200).json({ session_key, expires_at, block_count, price_per_block, monthly_total });
  } catch (e) {
    console.error('reserve error:', e);
    return res.status(500).json({ error: 'Internal server error', detail: e.message });
  }
}
