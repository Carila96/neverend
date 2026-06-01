import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const { data, error } = await supabase
      .from('subscription_contracts')
      .select('id,status,stage_id,anchor_x,anchor_y,width,height,plan_type,monthly_total_usd')
      .eq('stripe_session_id', session_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ status: 'pending', message: 'Contract not found yet' });
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error('get-contract error:', e);
    return res.status(500).json({ error: e.message });
  }
}
