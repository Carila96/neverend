// Standard CARILA WORKS public growth metrics endpoint.
// Aggregate funnel counts only. Revenue and raw event rows are intentionally not exposed.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('growth_events')
    .select('event_name')
    .gte('created_at', since);

  if (error) return res.status(500).json({ error: 'metrics unavailable' });

  const counts = { appView:0, offerView:0, cta:0, checkout:0, purchase:0 };
  for (const row of data || []) {
    if (row.event_name === 'app_view') counts.appView++;
    else if (row.event_name === 'sales_view') counts.offerView++;
    else if (row.event_name === 'sales_cta') counts.cta++;
    else if (row.event_name === 'checkout_created') counts.checkout++;
    else if (row.event_name === 'purchase_completed') counts.purchase++;
  }
  const rate = (from, to) => from > 0 ? Number(((to / from) * 100).toFixed(1)) : null;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(200).json({
    schemaVersion: '1.0',
    windowDays: 30,
    funnel: counts,
    conversion: {
      appToOffer: rate(counts.appView, counts.offerView),
      offerToCta: rate(counts.offerView, counts.cta),
      ctaToCheckout: rate(counts.cta, counts.checkout),
      checkoutToPurchase: rate(counts.checkout, counts.purchase),
    },
  });
}
