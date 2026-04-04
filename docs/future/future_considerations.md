# neverEND — Future Considerations

**Status:** Future memo only. No active implementation.  
**Last updated:** April 2025

This document captures concerns and possible future responses that do not require immediate action. Nothing in this document is scheduled or committed.

---

## Future Considerations — Placement Fragmentation Risk

### Problem Description

As grid sales grow, individual buyers may purchase small numbers of blocks scattered across a stage. Over time, this creates a fragmented grid where contiguous regions large enough for corporate logos (100-300 blocks) become increasingly rare.

This is not currently treated as abuse. Individual small purchases are legitimate use of the product.

However, if fragmentation becomes severe, it may:

- Reduce the attractiveness of grid placement for large brand buyers
- Lower the effective revenue ceiling per stage
- Frustrate users who cannot find suitable placement for logos
- Reduce visual quality of the in-game background (scattered uncoordinated imagery)

### Current Treatment

No special handling at this time. All purchases are first-come, first-served regardless of size.

The recommendation system in the sales page attempts to highlight contiguous available regions, but does not prevent fragmentation.

### Possible Future Responses

These are options only. None are approved or scheduled.

**Option A: Stronger recommendation logic**
- Improve the recommendation algorithm to more aggressively guide users toward areas that preserve contiguous space
- Does not prevent fragmentation but reduces its rate

**Option B: Reservation system**
- Allow large buyers to soft-reserve a region before formal purchase
- Prevents others from filling that region during the buyer's decision window
- Requires careful anti-abuse design (see `reservation_system_spec.md`)

**Option C: Placement rule adjustment**
- Introduce minimum block size requirements for certain stage zones
- Or designate enterprise-only zones with size minimums
- Significant change to product; requires ToS update

**Option D: Stage recycling**
- Retired or low-activity stages could be reset and re-sold
- High complexity; requires clear policies on existing subscriber rights

### When to Revisit

Consider revisiting this when:

- Any single stage reaches 60%+ occupancy
- Contiguous regions of 100+ blocks become scarce on popular stages
- Enterprise buyer inquiries include placement availability as a concern

---

## Future Considerations — Mobile Layout

The current sales page is optimized for desktop. Mobile layout is not yet implemented.

Consider responsive layout for:

- Grid canvas touch interaction (drag placement on mobile)
- Left panel collapsible on small screens
- Logo converter simplified for mobile upload flow

---

## Future Considerations — Real-Time Grid State

Currently the grid uses mock data. When Supabase is connected:

- Grid state must update in real-time or near-real-time
- Placement validation must use live data
- Race conditions during simultaneous purchase attempts must be handled (last-write-wins or optimistic locking)

---

## Future Considerations — Hall of Legends

Stage-first-clear tracking requires:

- User authentication at time of clear
- Permanent record storage in Supabase
- Public display page at neverend.game/hall-of-legends

---

*This file is for future planning only. No items here are active tasks.*
