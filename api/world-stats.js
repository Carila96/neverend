// api/world-stats.js — GET /api/world-stats
// Returns global world_stats (total deaths across all players).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('world_stats')
    .select('total_deaths')
    .eq('id', 1)
    .single();

  if (error || !data) return res.status(200).json({ total_deaths: 0 });

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({ total_deaths: data.total_deaths });
}
