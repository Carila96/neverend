// api/session-log.js — POST /api/session-log
// Logs a play session (time, deaths, max stage) to Supabase. Always returns 200.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { session_time, death_count, max_stage_reached } = req.body || {};
    const stage = parseInt(max_stage_reached, 10) || 1;
    await Promise.all([
      supabase.from('session_logs').insert({
        session_time:    parseInt(session_time, 10) || 0,
        death_count:     parseInt(death_count,  10) || 0,
        max_stage_reached: stage,
      }),
      supabase.from('world_stats').update({ best_stage: stage }).eq('id', 1).lt('best_stage', stage),
    ]);
  } catch (_) {}

  return res.status(200).json({ ok: true });
}
