import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {

  // GET /api/stats?type=death → 世界デス数のみ取得（旧 /api/death GET）
  if (req.method === 'GET' && req.query.type === 'death') {
    const { data, error } = await supabase
      .from('world_stats')
      .select('total_deaths')
      .eq('id', 1)
      .single();
    if (error || !data) return res.status(200).json({ total_deaths: 0 });
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({ total_deaths: data.total_deaths });
  }

  // POST /api/stats?type=death → 世界デス数+1（旧 /api/death POST）
  if (req.method === 'POST' && req.query.type === 'death') {
    // 加算ロジックは従来どおり total_deaths +1 のみ。
    // 変更点はエラーを握りつぶさなくなったこと（旧: catch(_){} + 常に 200 ok:true）。
    const { data: row, error: readErr } = await supabase
      .from('world_stats').select('total_deaths').eq('id', 1).single();
    if (readErr) {
      console.error('[stats:death] read failed:', readErr.message);
      return res.status(500).json({ ok: false, stage: 'read', error: readErr.message });
    }
    const next = (row?.total_deaths || 0) + 1;
    const { data: updated, error: updErr } = await supabase
      .from('world_stats').update({ total_deaths: next }).eq('id', 1).select('total_deaths');
    if (updErr) {
      console.error('[stats:death] update failed:', updErr.message);
      return res.status(500).json({ ok: false, stage: 'update', error: updErr.message });
    }
    if (!updated || updated.length === 0) {
      // RLSで弾かれると「0行更新・エラー無し」になる。SUPABASE_SERVICE_KEY が
      // service_role キーか（anon キーになっていないか）を確認すること。
      console.error('[stats:death] update affected 0 rows — check SUPABASE_SERVICE_KEY is the service_role key / world_stats RLS');
      return res.status(500).json({ ok: false, stage: 'update', error: 'no rows updated' });
    }
    return res.status(200).json({ ok: true, total_deaths: updated[0].total_deaths });
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
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({ total_deaths, best_stage, total_play_time, pilots });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
