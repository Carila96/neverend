// api/grid.js — GET /api/grid?stage_id=1  OR  GET /api/grid?tier=1
// With stage_id: returns current block states for a stage.
// With tier=1:   returns current price tier based on total claimed blocks.
import { createClient } from '@supabase/supabase-js';

const supabaseAnon    = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const GRID_COLS = 128;
const GRID_ROWS = 72;

const PRICE_TIERS = [
  { minBlocks: 0,       maxBlocks: 20000,    monthlyFull: 1000,  pricePerBlock: 0.40 },
  { minBlocks: 20001,   maxBlocks: 50000,    monthlyFull: 2000,  pricePerBlock: 0.70 },
  { minBlocks: 50001,   maxBlocks: 90000,    monthlyFull: 3500,  pricePerBlock: 1.10 },
  { minBlocks: 90001,   maxBlocks: 140000,   monthlyFull: 5000,  pricePerBlock: 1.60 },
  { minBlocks: 140001,  maxBlocks: 300000,   monthlyFull: 7500,  pricePerBlock: 2.40 },
  { minBlocks: 300001,  maxBlocks: 800000,   monthlyFull: 10000, pricePerBlock: 3.10 },
  { minBlocks: 800001,  maxBlocks: Infinity, monthlyFull: 12500, pricePerBlock: 4.00 },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // --- PRICE TIER MODE ---
  if (req.query.tier === '1') {
    const { count, error } = await supabaseService
      .from('owned_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'claimed');

    if (error) return res.status(500).json({ error: error.message });

    const totalClaimed = count || 0;
    const currentTier = PRICE_TIERS.find(t => totalClaimed <= t.maxBlocks) || PRICE_TIERS[PRICE_TIERS.length - 1];
    const currentTierIndex = PRICE_TIERS.indexOf(currentTier);
    const nextTier = PRICE_TIERS[currentTierIndex + 1] || null;

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({
      totalClaimedBlocks: totalClaimed,
      currentTier: {
        monthlyFull: currentTier.monthlyFull,
        pricePerBlock: currentTier.pricePerBlock,
        minBlocks: currentTier.minBlocks,
        maxBlocks: currentTier.maxBlocks,
      },
      nextTier: nextTier ? {
        monthlyFull: nextTier.monthlyFull,
        pricePerBlock: nextTier.pricePerBlock,
        triggerBlocks: nextTier.minBlocks,
        blocksRemaining: nextTier.minBlocks - totalClaimed,
      } : null,
      permanentPurchaseUnlocked: currentTier.monthlyFull >= 7500,
      permanentPurchasePrice: currentTier.monthlyFull * 24,
    });
  }

  // --- GRID DATA MODE ---
  const stage_id = parseInt(req.query.stage_id, 10);
  if (!stage_id || stage_id < 1) return res.status(400).json({ error: 'Missing or invalid stage_id' });

  // Expire stale reservations before returning grid state (non-fatal)
  try {
    await supabaseAnon.rpc('expire_stale_reservations');
  } catch (_) {}

  const { data: blocks, error } = await supabaseAnon
    .from('owned_blocks')
    .select('x, y, status, contract_id')
    .eq('stage_id', stage_id)
    .in('status', ['claimed', 'reserved']);

  if (error) {
    console.error('Grid fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch grid state' });
  }

  const { data: placements } = await supabaseAnon
    .from('placements')
    .select('anchor_x, anchor_y, width, height, image_url, image_data, zone_type, is_active')
    .eq('stage_id', stage_id)
    .eq('is_active', true);

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
