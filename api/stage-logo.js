/*
Run in Supabase SQL Editor:
create table if not exists logo_staging (
  session_key text primary key,
  image_data text not null,
  image_type text not null default 'image/png',
  created_at timestamptz not null default now()
);
*/

// api/stage-logo.js — POST /api/stage-logo
// Stores logo image data (base64) linked to a reservation session_key.
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { session_key, image_data, image_type } = req.body;
  if (!session_key || !image_data) return res.status(400).json({ error: 'Missing fields' });

  const { error } = await supabase
    .from('logo_staging')
    .upsert(
      { session_key, image_data, image_type: image_type || 'image/png', created_at: new Date().toISOString() },
      { onConflict: 'session_key' }
    );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
