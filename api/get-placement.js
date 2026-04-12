import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { contract_id } = req.query;

  if (!contract_id) return res.status(400).json({ error: 'Missing contract_id' });

  const { data, error } = await supabase
    .from('placements')
    .select('*')
    .eq('contract_id', contract_id)
    .eq('is_active', true);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ placements: data || [] });
}
