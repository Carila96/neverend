import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, session_key, contract_id, stage_id, image_data, image_type } = req.body;

  // POST /api/logo?action=stage ← 旧 /api/stage-logo
  // チェックアウト前にロゴをlogo_stagingテーブルに一時保存
  if (action === 'stage') {
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

  // POST /api/logo?action=update ← 旧 /api/upload-logo
  // マイページからの既存契約のロゴ差し替え
  if (action === 'update') {
    if (!contract_id || !stage_id || !image_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: contract, error: contractError } = await supabase
      .from('subscription_contracts')
      .select('*')
      .eq('id', contract_id)
      .eq('status', 'active')
      .maybeSingle();

    if (contractError || !contract) {
      return res.status(404).json({ error: 'Contract not found or not active' });
    }

    const { data: blocks } = await supabase
      .from('owned_blocks')
      .select('*')
      .eq('contract_id', contract_id)
      .eq('stage_id', stage_id)
      .eq('status', 'claimed');

    if (!blocks || blocks.length === 0) {
      return res.status(404).json({ error: 'No claimed blocks found for this contract and stage' });
    }

    const minX = Math.min(...blocks.map(b => b.x));
    const minY = Math.min(...blocks.map(b => b.y));
    const maxX = Math.max(...blocks.map(b => b.x));
    const maxY = Math.max(...blocks.map(b => b.y));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    const imageBuffer = Buffer.from(image_data, 'base64');
    const mimeType = image_type || 'image/png';
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `${contract_id}_${stage_id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true });

    let imageUrl;
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      imageUrl = `data:${mimeType};base64,${image_data}`;
    } else {
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const { error: placementError } = await supabase
      .from('placements')
      .upsert({
        contract_id, stage_id,
        anchor_x: minX, anchor_y: minY, width, height,
        image_url: imageUrl,
        zone_type: contract.zone_type,
        is_active: true,
        approved_at: new Date().toISOString()
      }, { onConflict: 'contract_id,stage_id' });

    if (placementError) {
      return res.status(500).json({ error: 'Failed to create placement' });
    }

    return res.status(200).json({ ok: true, storage: !uploadError, image_url: imageUrl });
  }

  return res.status(400).json({ error: 'Missing or invalid action' });
}
