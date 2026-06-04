import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixStorage() {
  console.log('Fetching placements...');
  const { data: placements, error } = await supabase
    .from('placements')
    .select('id, contract_id, stage_id, image_url');

  if (error) { console.error('Fetch error:', error); return; }
  if (!placements || placements.length === 0) { console.log('No placements found.'); return; }

  for (const p of placements) {
    try {
      // 古いパス（logos/logos/）からファイルを取得
      const oldPath = `logos/${p.contract_id}_${p.stage_id}.png`;
      const newPath = `${p.contract_id}_${p.stage_id}.png`;

      // 古いパスからダウンロード
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('logos')
        .download(oldPath);

      if (downloadError) {
        console.log(`File not found at ${oldPath}, trying direct download from URL...`);
        // URLから直接ダウンロード
        const response = await fetch(p.image_url);
        if (!response.ok) { console.error(`Failed to fetch ${p.image_url}`); continue; }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(newPath, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) { console.error(`Upload failed:`, uploadError.message); continue; }
      } else {
        // 新しいパスにアップロード
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(newPath, buffer, { contentType: 'image/png', upsert: true });
        if (uploadError) { console.error(`Upload failed:`, uploadError.message); continue; }
      }

      // Public URLを取得
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(newPath);
      const newUrl = urlData.publicUrl;

      // DBを更新
      const { error: updateError } = await supabase
        .from('placements')
        .update({ image_url: newUrl })
        .eq('id', p.id);

      if (updateError) { console.error(`DB update failed:`, updateError.message); }
      else { console.log(`Fixed ${p.id}: ${newUrl}`); }
    } catch (err) {
      console.error(`Error for ${p.id}:`, err.message);
    }
  }
  console.log('Done.');
}

fixStorage();
