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

  // POST /api/stats?type=stage&stage=N → 世界最高到達階を Math.max(既存, N) で更新。
  // ログイン不要（death POST と同じ anon 経路）。既存行は UPDATE のみで、削除・リセットは一切しない。
  if (req.method === 'POST' && req.query.type === 'stage') {
    const stage = parseInt(req.query.stage ?? req.body?.stage, 10);
    // 不正値で世界記録を汚さないための入力バリデーション（全100面 + 101エンディング分の余裕）
    if (!Number.isFinite(stage) || stage <= 0 || stage > 200) {
      return res.status(400).json({ ok: false, error: 'invalid stage' });
    }
    const { data: row, error: readErr } = await supabase
      .from('world_stats').select('best_stage').eq('id', 1).single();
    if (readErr) {
      console.error('[stats:stage] read failed:', readErr.message);
      return res.status(500).json({ ok: false, stage: 'read', error: readErr.message });
    }
    const current = row?.best_stage || 0;
    // 既存値以下なら何も書かない（後退防止その1）
    if (stage <= current) {
      return res.status(200).json({ ok: true, best_stage: current, updated: false });
    }
    // 後退防止その2: .lt() を付けることで「保存値がまだ stage より小さいときだけ」UPDATE する。
    // 並行リクエストで先に大きい値が入っていた場合は 0 行になり、小さい値で上書きしない。
    const { data: updated, error: updErr } = await supabase
      .from('world_stats').update({ best_stage: stage })
      .eq('id', 1).lt('best_stage', stage).select('best_stage');
    if (updErr) {
      console.error('[stats:stage] update failed:', updErr.message);
      return res.status(500).json({ ok: false, stage: 'update', error: updErr.message });
    }
    if (!updated || updated.length === 0) {
      // 競合で既に大きい値になっただけか、RLS で弾かれたのかを現在値で判別する
      const { data: after } = await supabase
        .from('world_stats').select('best_stage').eq('id', 1).single();
      const now = after?.best_stage || 0;
      if (now >= stage) return res.status(200).json({ ok: true, best_stage: now, updated: false });
      console.error('[stats:stage] update affected 0 rows — check SUPABASE_SERVICE_KEY is the service_role key / world_stats RLS');
      return res.status(500).json({ ok: false, stage: 'update', error: 'no rows updated' });
    }
    return res.status(200).json({ ok: true, best_stage: updated[0].best_stage, updated: true });
  }

  // GET /api/stats?type=world → 世界統計+テストパイロット名（旧 /api/world-stats）
  //   best_stage = 世界最高到達階。Hall of Legends の WORLD BEST タイルがこれを読む。
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
