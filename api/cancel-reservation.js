import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { session_key } = req.body;
  if (!session_key) return res.status(400).json({ error: 'Missing session_key' });

  try {
    // Get the reservation session
    const { data: session } = await supabase
      .from('reservation_sessions')
      .select('*')
      .eq('session_key', session_key)
      .single();

    if (session) {
      // Delete reserved owned_blocks for this session's coordinates
      await supabase
        .from('owned_blocks')
        .delete()
        .eq('stage_id', session.stage_id)
        .eq('status', 'reserved')
        .gte('x', session.anchor_x)
        .lte('x', session.anchor_x + session.width - 1)
        .gte('y', session.anchor_y)
        .lte('y', session.anchor_y + session.height - 1);

      // Mark session as expired
      await supabase
        .from('reservation_sessions')
        .update({ status: 'expired' })
        .eq('session_key', session_key);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
