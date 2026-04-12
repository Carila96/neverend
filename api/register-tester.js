/*
Run this SQL in Supabase SQL Editor before using this endpoint:

create table if not exists test_players (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Anonymous',
  stage_reached integer not null default 1,
  death_count integer not null default 0,
  play_time integer not null default 0,
  registered_at timestamptz not null default now()
);
*/

// api/register-tester.js — POST /api/register-tester
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, stage_reached, death_count, play_time } = req.body || {};

  await supabase.from('test_players').insert({
    name: (name || 'Anonymous').slice(0, 20),
    stage_reached: Number(stage_reached) || 1,
    death_count: Number(death_count) || 0,
    play_time: Number(play_time) || 0,
  }).catch(() => {});

  return res.status(200).json({ ok: true });
}
