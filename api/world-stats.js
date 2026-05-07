// api/world-stats.js — GET /api/world-stats
// Returns global stats + test pilot names.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [worldRes, pilotsRes] = await Promise.all([
    supabase.from('world_stats').select('total_deaths,best_stage,total_play_time').eq('id', 1).single(),
    supabase.from('player_profiles').select('player_name').eq('is_tester', true).order('created_at', { ascending: true }),
  ]);

  const total_deaths    = worldRes.data?.total_deaths    || 0;
  const best_stage      = worldRes.data?.best_stage      || 0;
  const total_play_time = worldRes.data?.total_play_time || 0;
  const pilots = (pilotsRes.data || []).map(r => r.player_name).filter(Boolean);

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({ total_deaths, best_stage, total_play_time, pilots });
}
