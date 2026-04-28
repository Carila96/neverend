// api/price-tier.js — GET /api/price-tier
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PRICE_TIERS = [
  { minBlocks: 0,       maxBlocks: 20000,      monthlyFull: 1000,  pricePerBlock: 0.40 },
  { minBlocks: 20001,   maxBlocks: 50000,      monthlyFull: 2000,  pricePerBlock: 0.70 },
  { minBlocks: 50001,   maxBlocks: 90000,      monthlyFull: 3500,  pricePerBlock: 1.10 },
  { minBlocks: 90001,   maxBlocks: 140000,     monthlyFull: 5000,  pricePerBlock: 1.60 },
  { minBlocks: 140001,  maxBlocks: 300000,     monthlyFull: 7500,  pricePerBlock: 2.40 },
  { minBlocks: 300001,  maxBlocks: 800000,     monthlyFull: 10000, pricePerBlock: 3.10 },
  { minBlocks: 800001,  maxBlocks: Infinity,   monthlyFull: 12500, pricePerBlock: 4.00 },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { count, error } = await supabase
    .from('owned_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'claimed');

  if (error) return res.status(500).json({ error: error.message });

  const totalClaimed = count || 0;

  const currentTier = PRICE_TIERS.find(t => totalClaimed <= t.maxBlocks) || PRICE_TIERS[PRICE_TIERS.length - 1];
  const currentTierIndex = PRICE_TIERS.indexOf(currentTier);
  const nextTier = PRICE_TIERS[currentTierIndex + 1] || null;

  const permanentPurchaseUnlocked = currentTier.monthlyFull >= 7500;

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
    permanentPurchaseUnlocked,
    permanentPurchasePrice: currentTier.monthlyFull * 24,
  });
}
