# Contract: Map Embed

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R1, R2, R4

The boundary between the kiosk and the one external system this feature touches. Everything here is
constrained by a single fact: **the frame is cross-origin and opaque**. We cannot read it, style it,
cancel events inside it, or know why it failed.

---

## 1. The embed element

```text
<iframe
  src="https://www.google.com/maps/d/embed?mid=<MAP_ID>"
  title=<localized>                        // FR-019: accessible name
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="no-referrer-when-downgrade"
  loading="eager"
  onLoad={…}
/>
```

### Required attributes and why each one is load-bearing

| Attribute | Value | Consequence if omitted or changed |
|-----------|-------|-----------------------------------|
| `sandbox` | exactly `allow-scripts allow-same-origin` | Adding `allow-popups` or `allow-top-navigation` re-enables the "Directions" / "View larger map" links and breaks FR-008 — the kiosk can be navigated away from with no way back. Removing `allow-scripts` breaks the map entirely. Removing `allow-same-origin` degrades Google's own storage access. |
| `title` | localized string | The frame's accessible name (FR-019). Must change with locale. |
| `loading` | `eager` | `lazy` would defer the load and make the 5s race (FR-013) start at an unpredictable moment. |
| `referrerpolicy` | `no-referrer-when-downgrade` | Conservative default; not security-critical, but avoids leaking the kiosk URL over plaintext. |

**The sandbox value is a security boundary, not a formatting choice.** Any change to it must be
re-verified against SC-006 by hand (see [../quickstart.md](../quickstart.md)).

### What we deliberately do NOT do

- **No CSS `pointer-events: none`** — it would satisfy FR-008 by breaking FR-010's pan/zoom.
- **No overlay** over the frame — same problem (research R3).
- **No attempt to read or restyle frame contents** — impossible cross-origin, and any code that
  looks like it tries will mislead the next reader.

---

## 2. Framing contract

The initial view (FR-007, FR-027) comes from the **saved default view of the My Maps map**, not from
URL parameters.

| Guarantee | Owner | How it is verified |
|-----------|-------|--------------------|
| All pins visible at initial framing, default state | Map author (editorial) | Visual check, both languages |
| All pins visible at initial framing, expanded state | Map author (editorial) | Visual check |
| Framing resets on every entry | Component lifecycle | The iframe is destroyed on unmount; a new one loads the saved view (research R6) |

Because the two display states have different aspect ratios, the saved view must fit the **narrower**
box (the default state's map area). The expanded state is wider and will show strictly more.

---

## 3. Load / failure semantics

```text
mount
  ├─ navigator.onLine === false ──────────────> failed (immediately)
  └─ otherwise
       ├─ iframe fires `load` within 5000ms ──> ready
       └─ 5000ms elapses first ───────────────> failed
```

| Rule | Detail |
|------|--------|
| Timeout | `MAP_LOAD_TIMEOUT_MS = 5000` (FR-013, SC-005) |
| Timer cleanup | The timeout MUST be cleared on `load` **and** on unmount (Principle V) |
| Terminal states | `ready` and `failed` do not transition within a mount — no retry timer |
| Recovery | On the next mount (FR-015). No in-view retry. |
| Offline fast path | `navigator.onLine === false` skips the wait. `true` is **not** treated as proof of reachability — it only means an interface is up. |

### Known limitation — now specified as FR-037, not merely noted here

If Google responds successfully with **its own error page** — map deleted, sharing revoked, rate
limited — the `load` event fires and this contract reports `ready`. The visitor sees Google's error
inside the frame rather than our fallback.

This is not fixable from the client: the frame is opaque. The post-plan clarification narrowed
FR-013 to the detectable failure class and added **FR-037**, which states this gap explicitly and
makes the companion list the standing mitigation; SC-005 no longer claims 0% raw provider errors.
The remaining mitigations are operational, not technical — the companion list still names every restaurant (so the screen remains useful), and
map ownership/sharing is treated as feature infrastructure that someone owns (spec Assumptions).

---

## 4. Privacy posture

Per the spec's Q5 clarification (FR-032, FR-033):

- The map loads immediately on entering the destination. **No consent gate, no click-to-load, no
  added notice.**
- The feature sends nothing about the visitor. The only outbound traffic is what the embed itself
  makes to render.
- Google's own branding and attribution inside the frame **must not be hidden** (FR-034). FR-008
  suppresses *navigation*, not attribution.

The basis for skipping consent (anonymous visitors, no per-visitor state, building-level IP) is
recorded in the spec's Assumptions along with the condition that would require revisiting it. If the
kiosk ever gains sign-in, personalization, or analytics, this section is void.
