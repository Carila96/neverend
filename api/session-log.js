// api/session-log.js — POST /api/session-log
// Logs a play session (time, deaths, max stage) to Supabase. Always returns 200.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { session_time, death_count, max_stage_reached } = req.body || {};
    const deaths = parseInt(death_count,      10) || 0;
    const stage  = parseInt(max_stage_reached, 10) || 1;
    const time   = parseInt(session_time,      10) || 0;

    const { data: ws } = await supabase.from('world_stats').select('*').eq('id', 1).single();
    await Promise.all([
      supabase.from('session_logs').insert({ session_time: time, death_count: deaths, max_stage_reached: stage }),
      supabase.from('world_stats').update({
        total_deaths:    (ws?.total_deaths    || 0) + deaths,
        best_stage:      Math.max(ws?.best_stage    || 0, stage),
        total_play_time: (ws?.total_play_time || 0) + time,
      }).eq('id', 1),
    ]);
  } catch (_) {}

  return res.status(200).json({ ok: true });
}
