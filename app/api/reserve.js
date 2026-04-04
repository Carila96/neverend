// api/reserve.js — POST /api/reserve
// Called when user confirms placement. Locks blocks for 30 min.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TTL_MINUTES = 30;
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type } = req.body;
  if (!stage_id || anchor_x == null || anchor_y == null || !width || !height || !zone_type || !plan_type)
    return res.status(400).json({ error: 'Missing required fields' });
  const block_count = width * height;
  const expires_at = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
  const session_key = randomBytes(32).toString('hex');
  const blocks = [];
  for (let dy = 0; dy < height; dy++)
    for (let dx = 0; dx < width; dx++)
      blocks.push({ stage_id, x: anchor_x + dx, y: anchor_y + dy, status: 'reserved', reserved_at: new Date().toISOString(), expires_at });
  const { data: conflicts } = await supabase.from('owned_blocks').select('x,y,status')
    .eq('stage_id', stage_id).in('status', ['claimed', 'reserved'])
    .gte('x', anchor_x).lt('x', anchor_x + width).gte('y', anchor_y).lt('y', anchor_y + height);
  if (conflicts && conflicts.length > 0)
    return res.status(409).json({ error: 'Placement conflict', message: 'Cannot place here — overlaps claimed blocks', conflicts: conflicts.map(b => ({ x: b.x, y: b.y })) });
  const { error: insertError } = await supabase.from('owned_blocks').insert(blocks);
  if (insertError) {
    if (insertError.code === '23505') return res.status(409).json({ error: 'Placement conflict', message: 'These blocks were just claimed by another user.' });
    return res.status(500).json({ error: 'Failed to reserve blocks' });
  }
  await supabase.from('reservation_sessions').insert({ session_key, stage_id, anchor_x, anchor_y, width, height, zone_type, plan_type, block_count, expires_at, status: 'pending' });
  return res.status(200).json({ session_key, expires_at, block_count });
}
