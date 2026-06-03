import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateLogs() {
  console.log('Fetching placements with Data URI image_url...');
  const { data: placements, error } = await supabase
    .from('placements')
    .select('id, contract_id, stage_id, image_url')
    .like('image_url', 'data:%');

  if (error) { console.error('Fetch error:', error); return; }
  if (!placements || placements.length === 0) { console.log('No Data URI placements found.'); return; }

  console.log(`Found ${placements.length} placements to migrate.`);

  for (const p of placements) {
    try {
      const match = p.image_url.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) { console.log(`Skipping ${p.id}: not a valid Data URI`); continue; }
      const mimeType = match[1];
      const base64Data = match[2];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const ext = mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `logos/${p.contract_id}_${p.stage_id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true });

      if (uploadError) { console.error(`Upload failed for ${p.id}:`, uploadError.message); continue; }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('placements')
        .update({ image_url: publicUrl })
        .eq('id', p.id);

      if (updateError) { console.error(`Update failed for ${p.id}:`, updateError.message); }
      else { console.log(`Migrated ${p.id}: ${publicUrl}`); }
    } catch (err) {
      console.error(`Error for ${p.id}:`, err.message);
    }
  }
  console.log('Migration complete.');
}

migrateLogs();
