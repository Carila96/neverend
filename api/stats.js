import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {

  // GET /api/stats?type=death → 世界デス数のみ取得（旧 /api/death GET）
  if (req.method === 'GET' && req.query.type === 'death') {
    const { data, error } = await supabase
      .from('world_stats')
      .select('total_deaths')
      .single();
    if (error || !data) return res.status(200).json({ total_deaths: 0 });
    return res.status(200).json({ total_deaths: data.total_deaths });
  }

  // POST /api/stats?type=death → 世界デス数+1（旧 /api/death POST）
  if (req.method === 'POST' && req.query.type === 'death') {
    try {
      const { data: row } = await supabase.from('world_stats').select('total_deaths').eq('id', 1).single();
      const next = (row?.total_deaths || 0) + 1;
      await supabase.from('world_stats').update({ total_deaths: next }).eq('id', 1);
    } catch (_) {}
    return res.status(200).json({ ok: true });
  }

  // GET /api/stats?type=world → 世界統計+テストパイロット名（旧 /api/world-stats）
  if (req.method === 'GET' && req.query.type === 'world') {
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

  return res.status(405).json({ error: 'Method not allowed' });
}
