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

  const { stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type } = req.body;
  if (!stage_id || anchor_x == null || anchor_y == null || !width || !height || !zone_type || !plan_type)
    return res.status(400).json({ error: 'Missing required fields' });

  if (anchor_x < 0 || anchor_x + width > 128 || anchor_y < 0 || anchor_y + height > 72)
    return res.status(400).json({ error: "Placement out of grid bounds (128x72)" });

  const block_count = width * height;

  // Fetch current price tier based on total claimed blocks (pre-purchase count)
  const { count: totalClaimed } = await supabase
    .from('owned_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'claimed');

  const total = totalClaimed || 0;
  const tier = PRICE_TIERS.find(t => total <= t.maxBlocks) || PRICE_TIERS[PRICE_TIERS.length - 1];
  const price_per_block = tier.pricePerBlock;
  const monthly_total = parseFloat(Math.max(5, price_per_block * block_count).toFixed(2));
  const expires_at = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
  const session_key = randomBytes(32).toString('hex');

  // Check for conflicts with claimed or unexpired reserved blocks
  const { data: conflicts } = await supabase
    .from('owned_blocks')
    .select('x,y,status')
    .eq('stage_id', stage_id)
    .in('status', ['claimed', 'reserved'])
    .gte('x', anchor_x).lt('x', anchor_x + width)
    .gte('y', anchor_y).lt('y', anchor_y + height);

  if (conflicts && conflicts.length > 0)
    return res.status(409).json({
      error: 'Placement conflict',
      message: 'Cannot place here — overlaps claimed or reserved blocks',
      conflicts: conflicts.map(b => ({ x: b.x, y: b.y, status: b.status })),
    });

  // Insert one row per block
  const blocks = [];
  for (let dy = 0; dy < height; dy++)
    for (let dx = 0; dx < width; dx++)
      blocks.push({
        stage_id,
        x: anchor_x + dx,
        y: anchor_y + dy,
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        expires_at,
      });

  const { error: insertError } = await supabase.from('owned_blocks').insert(blocks);
  if (insertError) {
    if (insertError.code === '23505')
      return res.status(409).json({ error: 'Placement conflict', message: 'These blocks were just claimed by another user.' });
    return res.status(500).json({ error: 'Failed to reserve blocks' });
  }

  // Create reservation session (checkout token)
  // price_per_block and monthly_total are returned in the response but not stored
  // until the DB migration adds those columns to reservation_sessions.
  const { error: sessionError } = await supabase.from('reservation_sessions').insert({
    session_key,
    stage_id,
    anchor_x,
    anchor_y,
    width,
    height,
    zone_type,
    plan_type,
    block_count,
    expires_at,
    status: 'pending',
  });

  if (sessionError) {
    // Roll back block inserts on session failure
    await supabase.from('owned_blocks')
      .delete()
      .eq('stage_id', stage_id)
      .gte('x', anchor_x).lt('x', anchor_x + width)
      .gte('y', anchor_y).lt('y', anchor_y + height)
      .eq('status', 'reserved');
    return res.status(500).json({ error: 'Failed to create reservation session' });
  }

  return res.status(200).json({ session_key, expires_at, block_count, price_per_block, monthly_total });
}
