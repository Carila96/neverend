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

const PARTNER_OFFER = 'partner_free12_then_90';

async function resolveDiscountCode(code) {
  if (!code) return null;

  // Partner codes are Stripe Promotion Codes. Their metadata defines the
  // second-phase coupon, so a customer enters only one code once.
  const partnerMatches = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });
  const promo = partnerMatches.data?.[0];
  if (promo?.metadata?.app === 'neverend' &&
      promo?.metadata?.offer === PARTNER_OFFER &&
      promo?.metadata?.year2_coupon_id) {
    const year1CouponId = typeof promo.promotion?.coupon === 'string'
      ? promo.promotion.coupon
      : promo.promotion?.coupon?.id;
    if (!year1CouponId) throw new Error('Partner promotion is missing its first-year coupon');

    const [year1, year2] = await Promise.all([
      stripe.coupons.retrieve(year1CouponId),
      stripe.coupons.retrieve(promo.metadata.year2_coupon_id),
    ]);
    const validYear1 = year1.valid && year1.percent_off === 100 &&
      year1.duration === 'repeating' && year1.duration_in_months === 12;
    const validYear2 = year2.valid && year2.percent_off === 90 &&
      year2.duration === 'forever';
    if (!validYear1 || !validYear2) throw new Error('Partner promotion configuration is invalid');

    return {
      discounts: [{ promotion_code: promo.id }],
      partner: {
        promotionCodeId: promo.id,
        year1CouponId,
        year2CouponId: year2.id,
        slot: promo.metadata.partner_slot || '',
      },
    };
  }

  // Legacy coupon IDs remain server-allowlisted.
  if (!ALLOWED_COUPONS.includes(code)) return null;
  const coupon = await stripe.coupons.retrieve(code);
  if (!coupon?.valid) return null;
  return { discounts: [{ coupon: code }], partner: null };
}

// ★追加G: Authorization: Bearer <supabase access token> を検証する。
//   logo.js の requireUser() と同じ形。
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_key, coupon_id } = req.body;
  if (!session_key) return res.status(400).json({ error: 'Missing session_key' });

  // ★追加G: 予約の所有者だけがチェックアウトを作れるようにする。
  //   これまでの防御は session_key(32バイト)の秘匿性だけだった。ログや Referer
  //   経由で漏れた場合に他人の予約でチェックアウトを作れてしまうため、
  //   予約を引く前にまずトークンを検証する（未認証には予約の存在自体を返さない）。
  const user = await requireUser(req, res);
  if (!user) return;

  const { data: reservation, error } = await supabase
    .from('reservation_sessions')
    .select('*')
    .eq('session_key', session_key)
    .eq('status', 'pending')
    .single();

  if (error || !reservation) return res.status(404).json({ error: 'Reservation session not found or already used' });

  // ★追加G: 予約の所有者確認。reserve.js が user_id をトークンから入れているので、
  //   ここで突き合わせられる。session_key を持っていること自体は既に確認済みなので
  //   （上の 404 を通過している）、403 を返しても新たに漏れる情報は無い。
  if (reservation.user_id !== user.id) {
    return res.status(403).json({ error: 'This reservation belongs to another account' });
  }

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
    app: 'neverend',
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

    if (coupon_id) {
      try {
        const resolvedDiscount = await resolveDiscountCode(coupon_id);
        if (!resolvedDiscount) {
          console.warn('[create-checkout] invalid discount code:', coupon_id);
          return res.status(400).json({ error: 'Invalid coupon code' });
        }
        sessionParams.discounts = resolvedDiscount.discounts;

        if (resolvedDiscount.partner) {
          // A 100% first invoice must still collect a reusable payment method
          // for the automatic charge that begins in year two.
          sessionParams.payment_method_collection = 'always';
          Object.assign(metadata, {
            partner_offer: PARTNER_OFFER,
            partner_promo_code_id: resolvedDiscount.partner.promotionCodeId,
            partner_year1_coupon_id: resolvedDiscount.partner.year1CouponId,
            partner_year2_coupon_id: resolvedDiscount.partner.year2CouponId,
            partner_slot: resolvedDiscount.partner.slot,
          });
          sessionParams.metadata = metadata;
          sessionParams.subscription_data.metadata = metadata;
        }
      } catch (couponErr) {
        console.warn('Coupon/promotion lookup failed:', coupon_id, couponErr.message);
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

