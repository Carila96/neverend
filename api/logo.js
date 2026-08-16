import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ★修正D-5: ロゴの内容検証。
//   許可形式は PNG と JPEG のみ。SVG は許可しない（<script> と外部参照を書けるため、
//   Storage の公開URLを直接開かれた場合や <img> 以外で描画された場合に XSS になる）。
//   申告された image_type は信用せず、実バイト列の先頭（マジックバイト）で判定する。
const MAX_LOGO_BYTES = 2 * 1024 * 1024;   // 2MB
function sniffImageType(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}
// base64 を検証してバッファを返す。問題があれば res を書いて null を返す。
function decodeLogo(image_data, res) {
  let buf;
  try {
    buf = Buffer.from(String(image_data), 'base64');
  } catch (_) {
    res.status(400).json({ error: 'Invalid image data' });
    return null;
  }
  if (!buf.length) {
    res.status(400).json({ error: 'Invalid image data' });
    return null;
  }
  if (buf.length > MAX_LOGO_BYTES) {
    res.status(400).json({ error: 'Image too large (max 2MB)' });
    return null;
  }
  const sniffed = sniffImageType(buf);
  if (!sniffed) {
    res.status(400).json({ error: 'Unsupported image format — PNG or JPEG only' });
    return null;
  }
  return { buf, sniffed };
}

// ★修正D: Authorization: Bearer <supabase access token> を検証する。
async function requireUser(req, res) {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, session_key, contract_id, stage_id, image_data, image_type } = req.body;

  // POST /api/logo?action=stage ← 旧 /api/stage-logo
  // チェックアウト前にロゴをlogo_stagingテーブルに一時保存
  if (action === 'stage') {
    if (!session_key || !image_data) return res.status(400).json({ error: 'Missing fields' });

    // ★追加G: 一時保存にも所有者確認を入れる。この時点では契約がまだ無いので
    //   契約ではなく予約(reservation_sessions)の user_id と突き合わせる。
    //   従来は session_key(32バイト)の秘匿性だけが防御で、漏れた場合に他人の予約の
    //   ロゴを差し替えられた。トークンは予約を引く前に検証する。
    const user = await requireUser(req, res);
    if (!user) return;

    const { data: reservation, error: reservationError } = await supabase
      .from('reservation_sessions')
      .select('user_id')
      .eq('session_key', session_key)
      .maybeSingle();

    if (reservationError || !reservation) {
      return res.status(404).json({ error: 'Reservation session not found' });
    }
    // session_key を持っていることは上で確認済みなので、403 を返しても
    // 新たに漏れる情報は無い（create-checkout.js と同じ返し分け）。
    if (reservation.user_id !== user.id) {
      return res.status(403).json({ error: 'This reservation belongs to another account' });
    }

    // ★修正D-5: 購入前の一時保存にも同じ内容検証をかける（ここを素通りさせると
    //   検証済みでないデータがそのまま本掲載へ流れる）。
    const checked = decodeLogo(image_data, res);
    if (!checked) return;
    const { error } = await supabase
      .from('logo_staging')
      .upsert(
        { session_key, image_data, image_type: checked.sniffed, created_at: new Date().toISOString() },
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

    // ★修正D: 所有者確認。他人のロゴを差し替えられないようにする。
    //   「存在しない」と「他人のもの」を区別せず 404 に統一（IDの存在判別を防ぐ）。
    const user = await requireUser(req, res);
    if (!user) return;

    // ★修正D-5: 内容検証を所有者確認の直後に行う（重い処理の前に弾く）。
    const checked = decodeLogo(image_data, res);
    if (!checked) return;

    const { data: contract, error: contractError } = await supabase
      .from('subscription_contracts')
      .select('*')
      .eq('id', contract_id)
      .eq('status', 'active')
      .maybeSingle();

    if (contractError || !contract || !contract.user_id || contract.user_id !== user.id) {
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

    // ★修正D-5: 申告 image_type ではなく、実バイト列から判定した型を使う。
    const imageBuffer = checked.buf;
    const mimeType = checked.sniffed;
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
