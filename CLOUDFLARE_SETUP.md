# Cloudflare Pages Migration Guide

## What to migrate
- index.html (game) → Cloudflare Pages
- app/pages/sales_page.html → Cloudflare Pages  
- public/*.html → Cloudflare Pages
- All static assets → Cloudflare Pages

## What stays on Vercel
- api/* (all serverless functions)
- Stripe webhook endpoint

## Steps
1. Create Cloudflare account at cloudflare.com
2. Connect GitHub repo Carila96/neverend
3. Set build output directory to / (root)
4. Set custom domain neverend.game when acquired
5. Update NEXT_PUBLIC_BASE_URL in Vercel to point to Cloudflare URL
6. Update Stripe webhook success_url and cancel_url

## Benefits
- Unlimited bandwidth (vs Vercel's paid tiers)
- Faster global CDN
- Free SSL
