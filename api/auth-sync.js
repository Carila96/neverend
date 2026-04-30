// api/auth-sync.js — POST /api/auth-sync
// Syncs localStorage player data to Supabase after login.
// Accepts: { user_id, player_name, total_deaths, best_stage, total_play_time, titles_earned }
// Upserts into player_profiles table.
/*
Run in Supabase SQL Editor:
create table if not exists player_profiles (
  id uuid primary key references auth.users(id),
  player_name text unique,
  total_deaths integer default 0,
  best_stage integer default 1,
  total_play_time integer default 0,
  titles_earned jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
*/
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, player_name, total_deaths, best_stage, total_play_time, titles_earned, is_tester, record_hall_of_legends, hall_stage_reached } = req.body || {};

  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  // Check name uniqueness if player_name provided
  if (player_name) {
    const { data: existing } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('player_name', player_name)
      .neq('id', user_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Name already taken. Choose another.' });
    }
  }

  const { error } = await supabase
    .from('player_profiles')
    .upsert({
      id: user_id,
      ...(player_name ? { player_name } : {}),
      total_deaths: total_deaths || 0,
      best_stage: best_stage || 1,
      total_play_time: total_play_time || 0,
      titles_earned: titles_earned || [],
      ...(is_tester ? { is_tester: true } : {}),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('Auth sync error:', error.message);
    return res.status(500).json({ error: 'Sync failed' });
  }

  // Optional: record to hall_of_legends (requires table to exist)
  if (record_hall_of_legends && player_name) {
    try {
      const pname = player_name || 'Unknown';
      await supabase.from('hall_of_legends').insert({
        user_id,
        player_name: pname,
        stage_reached: hall_stage_reached || 20,
        is_tester: is_tester || false,
      });
    } catch (_) {}
  }

  return res.status(200).json({ ok: true });
}
