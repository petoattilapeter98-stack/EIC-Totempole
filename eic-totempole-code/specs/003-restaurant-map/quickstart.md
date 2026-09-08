# Quickstart: Validating the Restaurant Map

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-08

How to prove this feature actually works. Some of it is automated; the parts that matter most —
FR-008 (the kiosk cannot be navigated away from) and FR-007 (all pins visible) — are **not testable
from the runner** and must be done by hand. Those are marked 🖐.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node + `npm install` | Playwright browsers must be installed for the `layout` project |
| A Google My Maps map | Public/unlisted, pins numbered, default view saved (see [contracts/curated-data.md](contracts/curated-data.md) §4) |
| `MAP_EMBED_URL` set | With the map's `mid`. A public identifier, not a secret — a plain module constant, not an env var |

---

## 1. Automated checks

```bash
npm run typecheck      # strict TS; catches a bad TabMeta or missing HU string
npm run test:unit      # data invariants, view states, idle bridge, cleanup
npm run test:layout    # real Chromium at 1920x1280 — no-scroll and touch targets
npm test               # all of the above
```

**What each layer is actually for:**

- `typecheck` — the `LocalizedText` type makes an untranslated string a **compile error**, and the
  registry's `as const satisfies` makes an unregistered tab id a compile error. Both are guarantees,
  not conventions.
- `test:unit` — data invariants (V1–V7), display-state transitions, the idle bridge's ceiling and
  cleanup.
- `test:layout` — the only place no-scroll and touch-target assertions mean anything. jsdom returns
  zero for every rect, so these would pass vacuously there.

### Expected results

| Check | Expected |
|-------|----------|
| Data invariants | Pass; ≤8 entries, numbers `1..n` |
| No page scroll, default state, 8 entries, EN + HU | Pass |
| No page scroll, expanded state | Pass |
| Expand and return controls ≥64px, ≥16px apart | Pass |
| Nav renders 5 tabs without wrapping or overflow | Pass |
| Unmount clears the focus poll and the load timeout | Pass |
| Repeated mount/unmount adds no retained state | Pass |

---

## 2. 🖐 Manual validation

Run `npm run dev` and open the kiosk at a 1920x1280 viewport.

### 2.1 🖐 The kiosk cannot be escaped (FR-008, SC-006) — do not skip

The single highest-consequence check in this feature. A visitor who reaches Google Maps proper has a
kiosk that cannot be recovered without physical access.

In **both** display states, try every affordance the embed offers: pin popups, "View larger map",
"Directions", Google branding, and a long-press on the map.

**Expected**: no new tab, no top-level navigation, no external app. The kiosk stays on the kiosk.
The spec's target is 0 escapes in 20 attempts.

If any attempt escapes, the `sandbox` attribute is wrong — see
[contracts/map-embed.md](contracts/map-embed.md) §1.

### 2.2 🖐 All restaurants visible at initial framing (FR-007, FR-027, SC-003)

Enter the map, then expand it. In **both** states, every pin is inside the visible map area with no
panning or zooming.

The two states have different aspect ratios, so passing in one does **not** imply the other. If a pin
is cut off, re-save the map's default view to fit the narrower (default-state) box.

### 2.3 🖐 List and pins agree (FR-023, SC-011)

With the map loaded, compare the companion list against the pins: every number in the list has a pin,
every pin has a list entry, counts match. Repeat in Hungarian.

This is the only check that catches drift between the two representations. Nothing automated can do
it (see [contracts/curated-data.md](contracts/curated-data.md) §1).

### 2.4 Offline fallback (FR-013, SC-005)

Block network access to `google.com` (DevTools offline mode, or a hosts entry) and enter the map.

**Expected**: within 5 seconds, a readable list of all restaurant names **and addresses** with a
localized explanation. No raw Google error, no empty frame, no endless spinner. Check the expanded
state too — a visitor can expand before the race resolves.

Then restore the network, leave the destination, and re-enter: the live map loads with no page
reload (FR-015).

### 2.5 Idle behaviour with an active visitor (FR-012) — the subtle one

Enter the map and **pan/zoom continuously inside the frame for 90 seconds**, touching nothing else.

**Expected**: the kiosk does **not** reset. Before the idle bridge existed, it would have reset at 60
seconds mid-interaction (research R3) — this scenario is the reason that code exists, so verify it
rather than assuming it.

Then stop touching it. Within roughly a minute the kiosk returns to Board Agenda, and re-entering the
map shows the **collapsed default state at the original framing** — not the previous pan position.

Finally, leave the map expanded and walk away: idle reset must exit the expanded state (FR-011), so
nobody is left on a screen with no nav bar.

### 2.6 Language (FR-018, SC-010)

Toggle EN/HU while the map is open. All feature copy — list heading, expand/return labels, fallback
message, addresses — switches. Restaurant proper names do not. The map does **not** reload and the
view does not reset.

### 2.7 Touch and accessibility (Principles III, VII)

- Every control works by touch alone; nothing is hover-revealed.
- Tab through the destination: expand control, return control (while expanded), and the list are all
  reachable with visible focus.
- Expanding moves focus to the return control; collapsing returns it to the expand control — and
  focus is **not** trapped while expanded (contract S7).
- A screen reader announces restaurant names from the list, not from inside the frame.

---

## 3. Constitution spot-checks before merge

| Principle | Check |
|-----------|-------|
| II — No scroll | §1 layout tests, both states, worst-case content |
| III — Touch targets | §1 layout tests + §2.7 |
| IV — Inline only | No route, no modal, no popup; grep the module for `dialog`, `createPortal`, `window.open` — all should be absent |
| V — Unattended reliability | §1 cleanup tests; confirm the focus poll and load timeout are both cleared on unmount |
| VI — No secrets | `npm run build`, then grep `dist/` for any key. Only the public `mid` should appear (SC-012) |
| VII — Accessibility | §2.7 |
| VIII — Static-first | `dist/` is static; no backend was added. The live-embed exception is recorded in [plan.md](plan.md) Complexity Tracking |
| IX — Isolation | Delete `src/tabs/restaurant-map/` and its registry line: the app must still build and run |

The Principle IX check is worth actually performing rather than reasoning about — it is the fastest
way to discover accidental coupling, and it takes under a minute to do and undo.
