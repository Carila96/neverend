# neverEND — Core Product Specification

**Status:** Active  
**Last updated:** April 2026  
**Operated by:** Carila (individual business, Japan)

---

## 1. Product Concept

neverEND is a browser-based hardcore platformer with an integrated grid placement marketplace.

Core model: **Game x Placement x Exposure**

---

## 2. Game System

### 2.1 Core Loop
- Browser-based horizontal platformer
- 30-second timer (Hard Mode: 25s), max 60s with hourglasses
- Death: spike, trap, fall, timer expiry
- #DamnRun hashtag for social sharing

### 2.2 Stage Structure
- Initial release: 20 stages. Target: 100 stages total
- Every 5th stage: Creator Zone
- World-first clears → Hall of Legends (permanent record)

### 2.3 Difficulty Modes

**Standard Mode:** 30s timer, warning traps in early stages, clearable through skill and memory

**Hard Mode** (HHHHH on title):
- 25s timer
- All warning traps → no-warning
- Traps 0.3s faster
- Additional traps in safe zones
- Concept: "These traps were designed with AI. Can you beat them?"
- Theoretically clearable. Hall of Legends tracks hard mode separately.

### 2.4 BGM
| Track | Stages |
|---|---|
| Cave March | 1-9 (non-5th) |
| Last Resolve | 10-19 (non-5th) |
| Beyond DAMN | 20-29 (non-5th) |
| No Return | 30-39 (non-5th) |
| Open Sky | All 5th stages |

---

## 3. Grid Placement System

### 3.1 Grid Specifications
- Resolution: 1280×720px
- Cell size: **16×16px**
- Grid: **80 columns × 45 rows = 3,600 blocks per stage**

### 3.2 Placement Types
- **Standard Grid:** One color per block
- **Creator Zone (5th stages):** PNG upload, multi-color
- **Enterprise Custom:** Request-based, separate pricing

### 3.3 Core UX Rule
Placement must be fully confirmed BEFORE payment. No exceptions.

---

## 4. Pricing System

### 4.1 Price Ladder

| Price | Trigger |
|---|---|
| $3/block/mo | Launch |
| $5/block/mo | 20% grid occupancy OR platform growth |
| $8/block/mo | 40% occupancy OR platform growth |
| $10/block/mo | 60% occupancy OR platform growth |
| $12/block/mo | 70% occupancy OR platform growth |
| $15/block/mo | 80% occupancy OR platform growth |

**Absolute maximum: $15/block/month**

Active subscriptions are never auto-increased. Changes apply to new subscriptions only.

### 4.2 Early Adopter Program

**Definition:** Users who subscribe at $5/block or below

**Benefits:**
- Price locked at contract price until $8 threshold is reached
- At $8 increase: all Early Adopters move to **$5/block permanently**
- $5 is the permanent cap — no further increases
- Volume discounts apply on top of $5 cap
- Early Adopters are **NOT eligible for Lifetime Purchase**

**Conditions:**
- Benefits lost permanently upon cancellation
- Re-subscription uses current market price

### 4.3 Volume Discounts

| Blocks | Discount |
|---|---|
| 1-24 | None |
| 25-99 | -10% |
| 100-249 | -20% |
| 250+ | -30% |

Applies to monthly, annual, and Early Adopter pricing. Does NOT stack with annual discount on Lifetime Purchase.

### 4.4 Annual Plan
- Billed as 10 months (2 months free, ~16.7% discount)
- Cancellation: elapsed months non-refundable, remaining months refunded pro-rata
- Annual discount does NOT apply to Lifetime Purchase

### 4.5 Loyalty Credit
- Monthly: active blocks × (price / 8) × months subscribed
- Annual: active blocks × (price / 4) × months subscribed
- Applied annually to future billing. Cannot be cashed out.

### 4.6 Lifetime Purchase

**Eligibility:** Standard subscribers only (Early Adopters excluded)

**Unlock:** When base market price reaches $10/block/month

**Price:** $10 × 30 months × block count (before volume discount)
- Volume discounts apply
- Annual discount does NOT apply

**Annual-to-Lifetime conversion:**
- Remaining unused annual months deducted from Lifetime price
- Value = (annual payment ÷ 12) × remaining months
- Existing subscription cancelled, balance charged as one-time payment

**Terms:**
- Guarantees placement for duration of service
- Content still subject to moderation
- Service termination refund policy specified in ToS

### 4.7 Plan Summary

| Plan | Who | Price | Lifetime eligible |
|---|---|---|---|
| Monthly | All | Market price (max $15) | Standard only |
| Annual | All | 10mo billed (2mo free) | Standard only |
| Early Adopter | ≤$5 at signup | $5 permanent cap | No |
| Lifetime | Standard only | $10×30mo×blocks | — |

### 4.8 Future Stage Billing
Charges for inaccessible stages do not begin until the stage is reachable in-game.

---

## 5. Technology Stack

| Layer | Tech |
|---|---|
| Frontend | HTML/CSS/JS (Canvas) |
| Hosting | Vercel |
| DB | Supabase |
| Auth | Google OAuth (planned) |
| Payments | Stripe |
| Domain | neverend.game (planned) |

---

## 6. Distribution Strategy
- Twitch / YouTube gameplay
- #DamnRun + death count share button (built into game)
- Soft launch with complimentary placements to known contacts
- Hall of Legends as organic content driver
- Monetization reveal after audience is built — not upfront

---

*This is the official master specification. All decisions must be consistent with this document.*
