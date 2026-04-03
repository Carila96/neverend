# neverEND — Reservation System Specification

**Status:** Future feature only. NOT active. NOT implemented.  
**Last updated:** April 2025

This document defines the anticipated design for a future reservation system. Nothing in this document is built or deployed. Implementation requires a separate decision and development cycle.

---

## 1. Current State

Reservation is **not implemented**.

The current system has two placement states only:

- `available` — block is open for purchase
- `claimed` — block is owned by an active subscriber

---

## 2. Why Reservation May Be Needed

Large buyers (corporate logos requiring 100-300+ blocks) may need time to:

- Review placement options internally
- Get budget or design approval
- Complete onboarding before payment

Without reservation, another buyer could claim the desired region during this window. This creates friction for high-value enterprise purchases.

---

## 3. Intended Future States

When reservation is implemented, the block state model expands to:

| State | Description |
|---|---|
| `available` | Open for immediate purchase |
| `reserved` | Temporarily held, not yet paid |
| `claimed` | Actively subscribed, paid |

---

## 4. Anticipated Data Structure

Future reservation records would require:

```
reservation = {
  stage_id: integer,
  x: integer,                  // top-left column (0-indexed)
  y: integer,                  // top-left row (0-indexed)
  w: integer,                  // width in blocks
  h: integer,                  // height in blocks
  reserved_by: string,         // user identifier
  reserved_at: timestamp,
  reserved_until: timestamp,   // expiry of hold
  reservation_type: string     // "free" | "paid"
}
```

These fields are anticipated only. Exact schema depends on Supabase implementation at time of build.

---

## 5. Hold Types (Future Options)

### 5.1 Short Free Hold

- Duration: short (exact duration TBD, likely minutes to hours)
- No payment required to initiate
- Automatically expires if not converted to purchase
- Intended for: users actively going through checkout
- Anti-abuse note: rate-limit free holds per account to prevent speculative hoarding

### 5.2 Paid Extended Hold

- Duration: longer (exact duration and pricing TBD)
- Requires a small payment to activate
- Refundable if converted to purchase within hold period
- Not refundable if hold expires without purchase
- Intended for: enterprise buyers requiring internal approval cycles
- Anti-abuse note: paid holds should be priced to reflect the actual cost of locking space

---

## 6. Anti-Abuse Considerations

Any reservation system must address:

- **Speculative hoarding**: users reserving large regions with no intent to purchase, to block competitors
- **Bot reservation**: automated reservations of prime real estate
- **Account abuse**: multiple accounts used to hold more space than allowed
- **Hold stacking**: chaining multiple short holds to simulate a permanent lock

Potential mitigations (future design decisions):

- Maximum reserved blocks per account at any time
- Minimum time between reservation attempts for same region
- Paid holds raise the cost barrier for speculative use
- Admin override capability to release suspicious holds

---

## 7. UI Implications (Future)

When reservation is implemented, the sales page will need:

- Visual distinction between `reserved` and `claimed` blocks in the grid (already prepared in current legend)
- Tooltip showing "RESERVED — available at [expiry time]" for reserved blocks
- Option to join a waitlist for reserved blocks (optional future feature)
- Reservation initiation flow (separate from purchase flow)

The current sales page already includes `reserved` state in the block rendering and legend as a forward-compatible preparation. No reservation behavior is active.

---

## 8. Relationship to Core Spec

The reservation system is an extension of the placement system described in `neverend_core_spec.md`. It does not change the core principle of placement-before-checkout. Reservation is a pre-placement feature, not a replacement for the placement confirmation flow.

---

*This document is future specification only. Do not implement any reservation behavior until this spec is formally approved and a development cycle is allocated.*
