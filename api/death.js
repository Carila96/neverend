// api/death.js — POST /api/death
// Increments the global world death counter in Supabase.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await supabase.rpc('increment_deaths').catch(() => {});
  return res.status(200).json({ ok: true });
}
