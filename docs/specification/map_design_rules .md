# neverEND Level Design Specification (Complete)
Last Updated: April 2026

---

## 0. Core Design Philosophy

"Accident → Realization → Mastery"

- Feels unfair at first, understandable after death
- First-try clear is possible but highly unlikely
- Safe-looking areas must not be fully trusted
- Death itself must be entertaining
- Design for "understanding after death", NOT "learning before death"

---

## 1. Core Rules

### One Concept Per Stage
- One main structure, one main trap, one primary death pattern
- Stage must be describable in one sentence

### One "Event" Per Stage
At least one of:
- Falling spikes / falling objects
- Collapsing floor
- Crushing wall
- Giant rolling object
- Any visually impactful, clip-worthy moment

### No First-Time Learning Required
- New traps CAN kill instantly on first encounter
- Must be logically understandable AFTER death

---

## 2. Map Structure Rules

- Each stage must feel structurally different (not just repositioned platforms)
- Each stage must include at least one vertical element (upward, drop, multi-level, air control)
- Flat-only maps are prohibited

### Structural Types (use variety, avoid rotation patterns)
- Flat, Step, Bowl/pit, Corridor, Room, Drop, Climb

---

## 3. Spike Design Rules

### Prohibitions
- Do NOT place spikes always on the same side
- Do NOT create platforms no player would use
- Do NOT create visible unavoidable death

### Required Variation Per Stage
Mix within each stage: left-side, right-side, center, safe-front/dangerous-back

### Visible Spikes Must Have Meaning
Each visible spike must be: avoidable with correct play OR a risk-reward shortcut

---

## 4. Hidden Trap Design

- Max 2 hidden traps per stage
- No repeated pattern across stages
- Must create: "This might be dangerous" OR "This looks dangerous but isn't"
- Must be understandable after death

---

## 5. Death Variety (MANDATORY)

Must use minimum 6 different types across stages:
- Static spikes, Hidden spikes, Falling spikes, Falling objects
- Collapsing platforms, Pendulum hazards, Chasing objects
- Lava/rising hazard, Crushing mechanics, Fake safe zones, Mimics

---

## 6. Moving Platform Rules

- Short distance, fast movement (speed 4.0+)
- Forces decision-making: "Should I jump now?" NOT "I'll wait"
- No large-scale map-crossing movement
- Each platform must serve a role: bridge / timing challenge / escape tool / trap interaction
- Starting position must be on player's side (sx = x for vx>0)

---

## 7. Mimic Rules

- Slight visual inconsistency (subtle tell)
- Activates on proximity
- 0.3–0.5 second delay before attack
- Explosion range must be avoidable
- Real chest nearby = risk/reward balance

---

## 8. Absolute Rules (NEVER VIOLATE)

- All coordinates must be multiples of 16px
- No spikes at spawn position
- No spikes at jump landing points
- No spikes overlapping goal area
- Do NOT repeat structures across stages
- Every stage must contain a clear concept
- Always consider video/streaming impact

---

## 9. Stage 1–5 Role Definition

| Stage | Role |
|---|---|
| 1 | Basic control + first death experience. Teaches "this game is not safe." |
| 2 | Introduce spike variation |
| 3 | First major "event" (something dramatic) |
| 4 | Structural shift (bowl, room, or drop type) |
| 5 | Define the game's identity: difficulty + fun + unpredictability |

---

## 10. Required Output Format Per Stage

For each stage document:
- Stage Number & Name
- Main Structure
- Main Trap Type
- Primary Death Pattern
- Player Decision Point
- Expected First Death Location
- Hidden Elements
- Video Highlight Moment
- Vertical Design Description
- Trap Types Used
- Purpose of the Stage

---

## 11. Advanced Gameplay Modifier System

### 13. TIME CONTROL SYSTEM (FOCUS ZONE)

**Core Concept:** "Remove time pressure, NOT difficulty"

- Timer pauses ONLY while player is inside the zone
- All traps and hazards remain active
- Must NOT function as a safe zone
- Must be skill-gated to reach (not freely accessible)
- Timer resumes immediately upon exit
- Max 1 per stage

### 14. VISIBILITY CONTROL SYSTEM (DARKNESS DESIGN)

**Core Concept:** "Limited vision, but always enough to act"

**Visibility Types:**
- Radius Vision (PRIMARY): Only area around player is visible
- Flash Reveal (OPTIONAL): Entire map visible for short moment periodically
- Light Item (OPTIONAL): Collectable that temporarily expands visibility

**Critical Rules:**
- Player MUST always see enough to react
- Do NOT create unavoidable deaths in darkness
- Hidden traps allowed ONLY if avoidable after first encounter
- Falling spikes and instant traps should be LIMITED in darkness stages
- Emphasis on: visible danger, spatial awareness, memory

**Good:** "I didn't see it, but now I understand"
**Bad:** "There was nothing I could do"

### 15. ADVERTISEMENT COMPATIBILITY IN DARKNESS STAGES

**Recommended approach:** Use advertisement blocks as light sources
- Certain grid blocks glow in darkness
- Visibility increases near ad placements
- Naturally draws player attention to logos
- Converts ads into gameplay elements — improves immersion

### 16. MODIFIER USAGE RULES

- Maximum ONE major modifier per stage
- Modifier must change player BEHAVIOR, not just visual appearance
- Same modifier must NOT appear in consecutive stages
- First encounter may cause failure; second attempt must allow understanding
- Modifiers must work WITH traps, not replace them

---

## 12. Falling Spike Visibility Rule

**All falling spikes must be visible before they fall.**

Implementation:
- Falling spikes are always placed at the ceiling (y:0 or touching ceiling platform)
- They are drawn in their starting position at full opacity BEFORE triggering
- Use amber/yellow color while stationary to signal danger
- When triggered, they accelerate downward with increasing red glow
- Player sees the spike on the ceiling and must decide: pass quickly or wait

**Purpose:** "I saw it, I knew it would fall, I misjudged the timing" — not "something appeared from nowhere"

This makes falling spikes a timing challenge, not an instant surprise kill.

---

## 13. Fairness & Reaction Rules (MANDATORY — NON-NEGOTIABLE)

### Rule 17: FAIRNESS RULE

**"A player must be able to avoid death AFTER learning from one failure."**

This is a strict design constraint, not a suggestion. All stages must comply.

### Rule 18: REACTION GUARANTEE RULE

Every lethal hazard MUST satisfy ALL of the following:

1. **Reaction Time Exists** — Player must have a minimum reaction window AFTER the hazard becomes visible or predictable. Instant unavoidable kills are FORBIDDEN.

2. **Predictability After First Death** — After dying once, player must understand: what killed them, where it came from, how to avoid it next time.

3. **Avoidance Must Be Possible** — There must exist at least ONE valid input sequence that avoids death. No "guaranteed death zones."

### Rule 19: FORBIDDEN DESIGNS

The following are STRICTLY PROHIBITED:
- Invisible + instant + unavoidable traps
- Hazards that spawn directly on player position with no delay
- Traps that require prior knowledge but give no visual or logical hint
- Situations where ALL possible paths lead to death

### Rule 20: REQUIRED FAILURE DESIGN

**"First death must teach something."**

Each trap must clearly communicate:
- Cause of death (visible or logically deducible)
- Timing (when it triggers)
- Space (where it affects)

If player dies and cannot explain WHY → design is invalid.

### Rule 21: VALID DECEPTION RULE

Unfair-looking design is allowed ONLY if:
- It becomes fair after understanding
- It can be avoided with skill, not luck

**Good:** Hidden spike that triggers after crossing a line → learnable
**Bad:** Random spike appearing with no pattern → invalid

### FINAL VALIDATION CHECKLIST (Run before finalizing every stage)

- [ ] Can the player avoid this after 1 death?
- [ ] Is there a reaction window?
- [ ] Is the cause understandable?
- [ ] Is there at least one safe solution?

If ANY answer is NO → redesign required.
