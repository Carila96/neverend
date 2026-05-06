// api/world-stats.js — GET /api/world-stats
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [worldRes, playersRes] = await Promise.all([
    supabase.from('world_stats').select('total_deaths').eq('id', 1).single(),
    supabase.from('test_players').select('stage_reached,play_time'),
  ]);

  const total_deaths = worldRes.data?.total_deaths || 0;
  const players = playersRes.data || [];
  const best_stage = players.reduce((m, p) => Math.max(m, p.stage_reached || 0), 0);
  const total_play_time = players.reduce((s, p) => s + (p.play_time || 0), 0);

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({ total_deaths, best_stage, total_play_time });
}
