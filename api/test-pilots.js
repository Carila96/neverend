// api/test-pilots.js — GET /api/test-pilots
// Returns player_name list from player_profiles where is_tester=true.
// Uses service key to bypass RLS.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('player_profiles')
    .select('player_name')
    .eq('is_tester', true)
    .order('created_at', { ascending: true });

  if (error) return res.status(200).json({ pilots: [] });

  const pilots = (data || []).map(r => r.player_name).filter(Boolean);
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(200).json({ pilots });
}
