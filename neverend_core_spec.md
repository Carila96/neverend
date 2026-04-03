# neverEND — Core Product Specification

**Status:** Active  
**Last updated:** April 2025  
**Operated by:** Carila (individual business, Japan)

---

## 1. Product Concept

neverEND is a browser-based hardcore platformer game with an integrated grid placement marketplace.

Core model: **Game x Placement x Exposure**

The game generates organic exposure through streaming, recording, and social sharing. Grid placements give businesses, creators, and individuals a persistent visual presence within that exposure.

---

## 2. Game System

### 2.1 Core Loop

- Browser-based horizontal scrolling platformer
- 30-second countdown timer (Hard Mode: 25s), maximum 60s
- Hourglass items: +5s each
- Stage clear: +3s
- Death conditions: timer expiry, spike collision, trap collision, fall
- On death: "DAMN!" effect displayed; instant restart
- Designed to be shared via #DamnRun hashtag

### 2.2 Stage Structure

- Initial release: 20 stages
- Every 5th stage: Creator Zone (PNG upload enabled)
- Every 7th stage: vertical scroll stage
- Difficulty increases with stage number
- Top ~% of players expected to reach Stage 10
- World-first clears recorded in Hall of Legends (permanent)

### 2.3 Hidden Modes

- Admin Mode: konami-style sequence
- Hard Mode: reduced timer
- Retro Mode: CRT overlay effect

### 2.4 BGM Assignment

| Track | Name | Stages |
|---|---|---|
| Track 01 | Cave March | 1-9 (non-5th) |
| Track 02 | No Return | 30-39 (non-5th) |
| Track 03 | Last Resolve | 10-19 (non-5th) |
| Track 04 | Beyond DAMN | 20-29 (non-5th) |
| Track 05 | Open Sky | All 5th stages (5,10,15...) |

---

## 3. Grid Placement System

### 3.1 Nature of Product

Grid placement is a **subscription-based display placement right**, not ownership.

- NOT equivalent to NFT or blockchain-based digital assets
- NOT transferable
- No resale rights

### 3.2 Grid Specifications

- Resolution: 1280x720
- Cell size: 16x16px
- Grid dimensions: 40 columns x 22 rows = 880 blocks per stage
- Total across all stages: scales with stage count

### 3.3 Placement Types

**Standard Grid (non-5th stages)**
- One color per block, selected via color picker
- Multi-block required for logos

**Creator Zone (5th stages: 5, 10, 15, 20...)**
- PNG image upload permitted
- Multi-color per block
- Personal and creator use priority
- Must NOT compete with or undercut standard corporate grid

**Enterprise Custom**
- Available upon request
- Separate order form
- Custom pricing outside standard tiers

### 3.4 Placement-Before-Checkout Principle

Users must fully determine placement BEFORE payment is processed:

1. Upload logo
2. Convert to pixelated block format
3. Choose size
4. Choose stage
5. Move logo on actual grid (draggable)
6. Validate placement (no overlap with claimed blocks)
7. Confirm final placement
8. Only then proceed to checkout

This is a core UX principle. Placement ambiguity after payment is not acceptable.

---

## 4. Pricing System

### 4.1 Standard Price Ladder

| Stage | Price per block/month |
|---|---|
| Launch (Early Adopter eligible) | $1-3 |
| Growth I | $5 |
| Growth II | $8 |
| Standard range | $10-15 |
| Absolute maximum | $20 |

Standard pricing is expected to operate mainly within the lower and mid tiers. The **absolute maximum is $20/block/month**, unconditionally.

### 4.2 Price Increase Logic

Increases are triggered when ANY condition is met:

- Grid occupancy reaches threshold (20/40/60/80%)
- Platform traction increases (users, views, exposure)

Exact thresholds are internal and not disclosed publicly. ToS states: "based on demand and platform growth."

Active subscriptions are **never auto-increased**. Price changes apply only to new subscriptions or renewals after notice.

### 4.3 Early Access Eligibility

- Eligibility: users who subscribe while base price is below $8
- May transition to minimum $5 within up to 6 months of subscription start
- Pricing remains fixed only while subscription stays active and continuous
- All early pricing conditions are permanently forfeited upon cancellation
- Re-subscription uses current pricing at time of re-subscription

### 4.4 Volume Discounts

| Active blocks | Discount |
|---|---|
| 1-24 | None |
| 25-99 | -10% |
| 100-249 | -20% |
| 250+ | -30% |

Applied automatically. Does not stack with other promotions unless stated.

### 4.5 Annual Plan

- Equivalent to 2 months free (~16.7% discount)
- Billed upfront for 12 months
- Partial refund on cancellation: elapsed months non-refundable, remaining full months refunded pro-rata

### 4.6 Loyalty Credit

- Monthly plan: active blocks x (current price / 8) x months subscribed
- Annual plan: active blocks x (current price / 4) x months subscribed
- Applied at end of each 12-month period to future billing
- Cannot be exchanged for cash
- Requires uninterrupted subscription

### 4.7 Future Stage Billing Rule

Charges for placements in stages not yet accessible do not begin until the stage becomes reachable in-game.

---

## 5. Content Moderation

### 5.1 Review Layers

1. Pre-submission automated screening
2. Human review before publication
3. User reports
4. Daily AI scan (Google Vision API)
5. Human review of flagged content

### 5.2 Responsibility

Users are solely responsible for the legality and rights clearance of submitted content.

### 5.3 Curable Violations

Minor violations receive a 72-hour correction window before removal.

### 5.4 Severe Violations (Immediate Removal)

- Illegal content
- Child safety risks
- Clear IP infringement
- Malware/phishing/fraud
- Hate speech or promotion of violence

---

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML / CSS / JavaScript (Canvas) |
| Hosting | Vercel |
| Database | Supabase |
| Authentication | Google OAuth |
| Payments | Stripe |
| Analytics | GA4 / Google Vision API |
| Domain | neverend.game |

---

## 7. Legal Framework

All legal documents are maintained in `/neverend/docs/legal/`.

- Terms of Service
- Privacy Policy (GDPR / CCPA compliant)
- Cookie Policy
- IP / DMCA Policy
- Content Policy

---

## 8. Distribution Strategy

- Twitch streaming (live gameplay and development)
- YouTube (recorded gameplay uploads)
- Carila brand consistency across all platforms
- #DamnRun organic social distribution
- Grid sales via neverend.game/placement (planned)
- Soft launch with complimentary placements to selected partners

---

*This document is the official master specification for neverEND. All implementation decisions must be consistent with the principles defined here.*
