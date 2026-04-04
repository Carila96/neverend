# neverEND — Sales Page Specification

**Status:** Active  
**Last updated:** April 2025  
**File:** `/neverend/app/pages/sales_page.html`

---

## 1. Purpose

The sales page is the primary conversion surface for grid placement purchases.

Its role is to:

- Explain the product concept
- Allow prospective buyers to visualize their logo in the game
- Guide users through a complete placement decision before checkout
- Present pricing transparently
- Block checkout until placement is fully confirmed

---

## 2. Core Principle: Placement Before Checkout

**Placement ambiguity after payment is not acceptable.**

The user must fully determine the following BEFORE checkout becomes available:

- Which stage
- Where the logo is positioned (exact grid coordinates)
- Whether the placement is valid (no overlap with claimed blocks)

This is a hard rule. The checkout button must remain disabled until all three conditions are met and explicitly confirmed by the user.

---

## 3. Page Structure

| Section | Purpose |
|---|---|
| Header | Navigation, primary CTA |
| Hero | Product concept, value proposition |
| Stats bar | Live counts (total blocks, claimed, available, current price) |
| Placement Tool | Full logo-to-grid placement flow |
| Pricing | Transparent pricing tiers, volume discounts, corporate guide |
| Footer | Legal links |

---

## 4. Placement Tool Flow

### 4.1 Step Sequence

The flow is strictly sequential:

1. **Upload** — User uploads logo image (PNG/JPG/SVG)
2. **Convert** — Logo is pixelated to chosen block size
3. **Position** — User drags logo on actual grid to select placement
4. **Confirm** — User explicitly confirms final placement
5. **Checkout** — Purchase panel opens; payment is processed

### 4.2 Upload

- Accepted formats: PNG, JPG, SVG
- PNG transparency must be preserved
- Transparent pixels are treated as empty/non-existent blocks in preview
- File is loaded client-side only (no server upload at this stage)

### 4.3 Size Selection

Presets:

| Label | Target blocks | Approx dimensions |
|---|---|---|
| Small | ~100 | 10x10 |
| Standard | ~200 | 14x14 |
| Large | ~300 | 17x18 |
| Custom | user-defined | up to 40x22 |

Size can be changed after conversion. Changing size triggers re-conversion.

### 4.4 Conversion

- Logo is rendered into a pixelated offscreen canvas at the selected block dimensions
- Transparency is preserved pixel-by-pixel
- A small pixel preview is shown in the control panel
- Conversion must complete before placement can begin

### 4.5 Stage Selection

- All currently accessible stages are available in the dropdown and via prev/next buttons
- Stage can be changed at any time without losing the converted logo
- When stage changes, placement validation is immediately recalculated
- When stage changes, a new set of recommendations is generated

### 4.6 Draggable Placement

- The converted logo moves as a single unit on the grid
- Movement snaps to grid block coordinates
- Logo is positioned by clicking and dragging within its bounding box
- Keyboard nudging may be added in future

### 4.7 Placement Validation (Real-Time)

Validation runs on every drag update and on stage change.

**Valid state:**
- All blocks within logo bounds are in `available` state
- Blue bounding box
- Status message: `Placement available`

**Invalid state:**
- One or more blocks overlap `claimed` or `reserved` cells
- Red bounding box
- Conflict cells highlighted in red
- Status message: `Cannot place here — overlaps claimed blocks`

### 4.8 Recommendation System

- System scans the current stage grid for contiguous available regions that can fit the current logo size
- Up to 4 suggestions are presented in the control panel
- Suggestions are labeled by position (column, row)
- Clicking a suggestion moves the logo to that position instantly
- Recommendations are optional; user can place manually
- This must be clearly communicated in the UI

Priority rule: **contiguous regions only**. A region qualifies only if all required blocks within the logo footprint are available. Scattered available cells do not qualify.

### 4.9 Placement Confirmation

After reaching a valid position:

- A summary panel shows: stage, position (col, row), size (WxH), total blocks
- User must click "Confirm and Proceed to Checkout"
- Only after explicit confirmation does the checkout panel open
- Confirmed placement data is stored in client state

### 4.10 Confirmed Placement State

Stored fields:

```
confirmedPlacement = {
  stage: integer,
  x: integer,        // top-left column (0-indexed)
  y: integer,        // top-left row (0-indexed)
  w: integer,        // logo width in blocks
  h: integer,        // logo height in blocks
  blocks: integer    // total block count (w * h)
}
```

---

## 5. Checkout Panel

Opens only after placement confirmation.

Contents:

- Stage, position, size, block count, placement type (Standard / Creator Zone)
- Billing plan selection (Monthly / Annual)
- Price breakdown (base price, volume discount, plan discount, monthly total)
- Annual billing amount (shown when annual plan is selected)
- Primary CTA button
- Legal notice (ToS, Privacy Policy, EU withdrawal rights)

CTA button text:

- Monthly: "CLAIM THIS PLACEMENT"
- Annual: "SECURE THIS PLACEMENT"

---

## 6. Pricing Display Rules

### 6.1 Pricing Tiers

- Early Access Eligibility: described as eligibility condition, not a numeric range
- Launch Standard: $3/block/month (current)
- Growth Pricing: described as staged increases, no fake range displayed
- Absolute Cap: $15/block/month, displayed as hard unconditional limit

### 6.2 Volume Discounts

Displayed as a table. Applied automatically at checkout.

### 6.3 Corporate Logo Guide

Block counts are approximate guides only. Price examples are labeled:

`Example pricing (illustrative only)`

Prices must not appear as fixed offers.

---

## 7. Color System

| Color | Role |
|---|---|
| Red (--accent) | Primary CTA, brand logo END, claimed state indicator |
| Blue (--accent2) | Interaction, selection, valid placement, tools |
| Gold (--gold) | Price indicators, value signals |
| Text (--text) | Body copy |
| Muted (--muted, --muted2) | Labels, secondary info, decorative elements |

Red must not be used for decorative or non-meaningful UI elements.

---

## 8. Checkout Blocking Rules

Checkout is blocked unless ALL of the following are true:

1. `uploadedImage !== null`
2. `logoConverted === true`
3. `placementValid === true`
4. `confirmedPlacement !== null`

If any condition is unmet, the checkout button is either hidden, disabled, or unavailable.

---

## 9. Future Scope (Not Active)

- Reservation system (see `reservation_system_spec.md`)
- Supabase real-time grid state
- Stripe checkout integration
- Login / My Page
- Mobile-optimized layout

---

*This document governs the sales page only. For core product decisions, refer to `neverend_core_spec.md`.*
