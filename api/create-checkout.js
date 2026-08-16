// api/create-checkout.js — POST /api/create-checkout
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BASE_URL = 'https://damnrun.com';

// ★修正C: 適用を許すクーポン ID の許可リスト。
//   環境変数 ALLOWED_COUPON_IDS にカンマ区切りで設定する（例: FRIENDS100,PRESS50）。
//   未設定ならクーポンは一切適用されない（安全側に倒す）。
//   クライアントからは読めないサーバー側の値なので、ID を推測されても効かない。
const ALLOWED_COUPONS = (process.env.ALLOWED_COUPON_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_key, coupon_id } = req.body;
  if (!session_key) return res.status(400).json({ error: 'Missing session_key' });

  const { data: reservation, error } = await supabase
    .from('reservation_sessions')
    .select('*')
    .eq('session_key', session_key)
    .eq('status', 'pending')
    .single();

  if (error || !reservation) return res.status(404).json({ error: 'Reservation session not found or already used' });

  if (new Date(reservation.expires_at) < new Date()) {
    await supabase.from('reservation_sessions').update({ status: 'expired' }).eq('session_key', session_key);
    return res.status(410).json({ error: 'Reservation session has expired — please start over' });
  }

  const { block_count, plan_type, stage_id, anchor_x, anchor_y, width, height, zone_type, monthly_total } = reservation;

  // admin_key による「Stripe を通さず直接 claimed にする」経路は削除した。
  // ブロックが claimed になるのは webhook が支払い成立を確認した場合だけになる。

  // Use monthly_total stored in reservation (calculated at reserve time from live price tier)
  // Annual = 10 months upfront
  const monthly_total_raw = reservation.monthly_total;
  const amountCents = plan_type === 'annual'
    ? monthly_total_raw * 10 * 100
    : monthly_total_raw * 100;

  // ★修正B（多層防御）: reserve.js 側でも 0 以下を弾いているが、将来 reserve.js を
  //   通らない経路が生まれても 0 円チェックアウトを作らないよう、ここでも止める。
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    console.error('[create-checkout] refused non-positive amount', { session_key, amountCents });
    return res.status(400).json({ error: 'Invalid order amount' });
  }

  const metadata = {
    session_key,
    stage_id:    String(stage_id),
    anchor_x:    String(anchor_x),
    anchor_y:    String(anchor_y),
    width:       String(width),
    height:      String(height),
    block_count: String(block_count),
    plan_type,
    zone_type,
  };

  try {
    let sessionParams;

    if (plan_type === 'monthly') {
      sessionParams = {
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'neverEND Grid Placement' },
            unit_amount: amountCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        subscription_data: { metadata },
        metadata,
        success_url: `${BASE_URL}/app/pages/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/app/pages/cancel.html`,
      };
    } else {
      // Annual = subscription with yearly interval (10 months upfront price)
      sessionParams = {
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'neverEND Grid Placement (Annual)' },
            unit_amount: amountCents,
            recurring: { interval: 'year' },
          },
          quantity: 1,
        }],
        subscription_data: { metadata },
        metadata,
        success_url: `${BASE_URL}/app/pages/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/app/pages/cancel.html`,
      };
    }

    // ★修正C: クーポンは許可リスト方式。
    //   旧実装は「Stripe 上に存在して valid なら何でも適用」だったため、100% OFF の
    //   クーポンを 1 つ作るだけで、ID を知る/推測した誰もが無料購入できる状態だった
    //   （クーポン ID は LAUNCH50 のような推測しやすい文字列になりがち）。
    //   許可リストはサーバー側の環境変数だけで持ち、クライアントには一切出さない。
    //   リスト外は「無視」ではなく 400 で拒否する（黙って定価で通すと、割引が
    //   効かない理由が購入者にも運用者にも分からなくなるため）。
    if (coupon_id) {
      if (!ALLOWED_COUPONS.includes(coupon_id)) {
        console.warn('[create-checkout] coupon not in allowlist:', coupon_id);
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
      try {
        const coupon = await stripe.coupons.retrieve(coupon_id);
        if (coupon && coupon.valid) {
          sessionParams.discounts = [{ coupon: coupon_id }];
        } else {
          return res.status(400).json({ error: 'Invalid coupon code' });
        }
      } catch (couponErr) {
        console.warn('Coupon not found or invalid:', coupon_id, couponErr.message);
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('SESSION CREATED:', session.id, 'amount_cents:', amountCents, 'livemode:', session.livemode);

    await supabase
      .from('reservation_sessions')
      .update({ stripe_session_id: session.id })
      .eq('session_key', session_key);

    return res.status(200).json({
      url:        session.url,
      session_id: session.id,
      livemode:   session.livemode,
    });

  } catch (err) {
    console.error('STRIPE ERROR:', err);
    return res.status(500).json({ error: err.message, type: err.type || null, code: err.code || null });
  }
}
