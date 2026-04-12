// api/death.js — GET /api/death (world count) | POST /api/death (increment)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('world_stats')
      .select('total_deaths')
      .single();
    if (error || !data) return res.status(200).json({ total_deaths: 0 });
    return res.status(200).json({ total_deaths: data.total_deaths });
  }
  if (req.method === 'POST') {
    await supabase.rpc('increment_deaths').catch(() => {});
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
