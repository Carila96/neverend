import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { contract_id, stage_id, image_data, image_type } = req.body;

  if (!contract_id || !stage_id || !image_data) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify contract exists and is active
    const { data: contract, error: contractError } = await supabase
      .from('subscription_contracts')
      .select('*')
      .eq('id', contract_id)
      .eq('status', 'active')
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ error: 'Contract not found or not active' });
    }

    // Get owned blocks for this contract
    const { data: blocks } = await supabase
      .from('owned_blocks')
      .select('*')
      .eq('contract_id', contract_id)
      .eq('stage_id', stage_id)
      .eq('status', 'claimed');

    if (!blocks || blocks.length === 0) {
      return res.status(404).json({ error: 'No claimed blocks found for this contract and stage' });
    }

    // Calculate placement bounds from blocks
    const minX = Math.min(...blocks.map(b => b.x));
    const minY = Math.min(...blocks.map(b => b.y));
    const maxX = Math.max(...blocks.map(b => b.x));
    const maxY = Math.max(...blocks.map(b => b.y));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Store base64 image data directly (for simplicity)
    // In production, this would go to Supabase Storage
    const imageUrl = `data:${image_type || 'image/png'};base64,${image_data}`;

    // Upsert placement record
    const { data: placement, error: placementError } = await supabase
      .from('placements')
      .upsert({
        contract_id,
        stage_id,
        anchor_x: minX,
        anchor_y: minY,
        width,
        height,
        image_url: imageUrl,
        zone_type: contract.zone_type,
        is_active: true,
        approved_at: new Date().toISOString()
      }, { onConflict: 'contract_id,stage_id' })
      .select()
      .single();

    if (placementError) {
      return res.status(500).json({ error: 'Failed to create placement' });
    }

    return res.status(200).json({ ok: true, placement_id: placement.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
