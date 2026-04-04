// api/grid.js — GET /api/grid?stage_id=1
// Returns current block states for a stage. Used by the sales page to render the grid.
import { createClient } from '@supabase/supabase-js';

// Anon key: public read only (RLS policy "public read owned blocks" allows this)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const GRID_COLS = 80;
const GRID_ROWS = 45;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const stage_id = parseInt(req.query.stage_id, 10);
  if (!stage_id || stage_id < 1) return res.status(400).json({ error: 'Missing or invalid stage_id' });

  // Expire stale reservations before returning grid state
  // (Supabase pg_cron handles this periodically, but we clean up on read too)
  await supabase.rpc('expire_stale_reservations').catch(() => {}); // non-fatal if it fails

  const { data: blocks, error } = await supabase
    .from('owned_blocks')
    .select('x, y, status, contract_id')
    .eq('stage_id', stage_id)
    .in('status', ['claimed', 'reserved']);

  if (error) {
    console.error('Grid fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch grid state' });
  }

  // Also fetch active placements (image/color data) for claimed blocks
  const { data: placements } = await supabase
    .from('placements')
    .select('anchor_x, anchor_y, width, height, image_url, image_data, zone_type, is_active')
    .eq('stage_id', stage_id)
    .eq('is_active', true);

  // Cache for 5 seconds on the CDN — short TTL because reservations expire in 30 min
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');

  return res.status(200).json({
    stage_id,
    grid: { cols: GRID_COLS, rows: GRID_ROWS },
    blocks: blocks ?? [],
    placements: placements ?? [],
    total_blocks: GRID_COLS * GRID_ROWS,
    claimed_count: (blocks ?? []).filter(b => b.status === 'claimed').length,
    reserved_count: (blocks ?? []).filter(b => b.status === 'reserved').length,
  });
}
