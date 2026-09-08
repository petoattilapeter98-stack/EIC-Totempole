# Implementation Plan: Restaurant Map

**Branch**: `feature/mappage` (spec directory `003-restaurant-map`) | **Date**: 2026-09-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-restaurant-map/spec.md`

## Summary

Add a fifth kiosk destination that shows up to 8 curated nearby restaurants on a keyless embedded
Google My Maps map, with a numbered companion list beside it and an expand-to-fullscreen state.

The whole feature is one new tab module (`src/tabs/restaurant-map/`) registered in the existing tab
registry, plus one shared-chrome fix. It ships **no new runtime dependencies**, **no backend**, and
**no API key** — the embed is the keyless `google.com/maps/d/embed?mid=…` form, so Constitution
Principle VI is satisfied structurally rather than by configuration.

Three findings from reading the existing code shape the design:

1. **The idle timer cannot see interaction inside the map.** `useIdleReset` listens on
   `document`, but pointer events inside a cross-origin iframe never reach the parent document. Left
   alone, a visitor panning the map is reset out from under them after 60s — FR-012 fails silently.
   Resolved by focus-transfer detection with a hard session ceiling (research R3).
2. **State reset on entry and idle is already free.** `ContentRegion` is keyed on `activeTab`, and
   idle reset returns to `DEFAULT_TAB_ID`, so the tab unmounts. Keeping expand/framing state local to
   the module makes FR-011 fall out of unmounting — no `KioskContext` change, no cross-feature
   coupling (research R6).
3. **The nav's column count is hardcoded** (`repeat(4, 1fr)` in `TabNav.module.css`), which
   contradicts the registry's "add one entry, nothing else changes" promise. A fifth tab requires
   fixing that one line (research R7).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: react, react-dom, lucide-react — **no new dependencies added**. No map SDK, no i18n library, no state library.

**Storage**: N/A. The curated list is a static in-repo TypeScript module; the map pins live in a Google My Maps map. Nothing is persisted at runtime (FR-033).

**Testing**: Vitest 3, two projects — `unit` (jsdom) for data invariants, strings, state logic; `layout` (real Chromium at 1920x1280 via Playwright) for no-scroll, touch targets, and both display states.

**Target Platform**: Chromium on Microsoft Surface Hub 2S, 1920x1280 CSS px, touch-only, multi-day uptime.

**Project Type**: Static single-page application (Vite build, `dist/` static output). No server component.

**Performance Goals**: Map interactive ≤3s (SC-002); fallback rendered ≤5s (SC-005); at most one additional bounded timer while the map tab is mounted, zero timers when it is not.

**Constraints**: No page scroll in either display state; ≥64px touch targets with ≥16px separation; no credential in the client bundle; no modal/route/popup; no unbounded state growth across multi-day uptime.

**Scale/Scope**: ≤8 restaurants (FR-031); 1 new tab module (~7 files); 5 nav entries total; 1 shared-chrome line changed.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design.*

| # | Principle | Verdict | How this design satisfies it |
|---|-----------|---------|------------------------------|
| I | Kiosk-First Hardware Target | **PASS** | Built and verified only at 1920x1280. No hover affordance: names are always visible in the companion list (FR-006), never hover- or tap-revealed. No right-click, no keyboard requirement. |
| II | Fixed 3:2 Viewport, No Scroll | **PASS** | Content bounded by construction: the list is capped at 8 (FR-031), the map is a fixed-ratio box, the expanded state is `position: fixed; inset: 0`. Layout test asserts no overflow in **both** states, at 8 entries, in both languages. |
| III | Minimum Touch Target Sizing | **PASS** | Two new controls (expand, return) sized via the existing `--touch-target-min` / `--touch-gap-min` tokens. Nav at 5 columns still yields ~350px-wide tabs, far above the minimum. Asserted in the layout test. |
| IV | Single-Page, Inline-Only Updates | **PASS** | No route, no modal, no popup. Both display states are React state inside one mounted component. The expanded state is a `position: fixed` inline panel, not a dialog — no `<dialog>`, no portal to `document.body`, no `role="dialog"`. FR-008 additionally blocks the *embed* from navigating away (research R2). |
| V | Unattended Multi-Day Reliability | **PASS, with attention** | The feature adds exactly one timer (the focus poll, research R3). It is created on mount, cleared on unmount, and bounded by a session ceiling so it can never hold the kiosk awake indefinitely. No accumulating collections; the curated list is a frozen module constant. Verified by a mount/unmount cycle test. |
| VI | Zero Secrets in the Client Bundle | **PASS** | The keyless `maps/d/embed?mid=…` form needs no API key and no proxy. The `mid` is a public map identifier, not a credential. SC-012 asserts zero keys in the built bundle. |
| VII | Accessibility Baseline | **PASS** | The companion list is real localized text, reachable and announceable (FR-028, FR-030). The embed's pins are explicitly *not* relied on for any accessible name. Expand/return controls are real buttons with localized `aria-label`s and correct focus handling. |
| VIII | Static-First Delivery | **DEVIATION — justified** | The embedded map is a live third-party dependency. Spec Assumptions flagged this as a scoped exception; this plan confirms it. See Complexity Tracking. |
| IX | Modular Feature Isolation | **PASS, with one shared-chrome fix** | All feature code lives in `src/tabs/restaurant-map/`. It reads only the public `useKiosk()` locale and the public `TabModule` contract; it touches no other feature's state, DOM, or storage. Deleting the folder and its one registry line removes it completely. The `TabNav.module.css` change is a fix to shared chrome, not coupling — see Complexity Tracking. |

**Gate result: PASS.** One justified deviation (VIII), one shared-chrome change recorded below. No unjustified violations, so Phase 0 proceeds.

### Post-Phase-1 re-evaluation

Re-checked after the design artifacts were written. **Still PASS**, with two design decisions that
tightened compliance rather than loosening it:

- **Principle V** got stricter during design: the naive "treat iframe focus as ongoing activity"
  approach would let a stuck focus hold the kiosk out of its idle reset forever — a multi-day
  failure with no operator to notice. The contract now caps map-driven activity extension at
  `MAX_MAP_SESSION_SECONDS`, after which idle reset proceeds regardless (see
  [contracts/view-states.md](contracts/view-states.md)).
- **Principle IV** was re-examined for the expanded state. `position: fixed` inside the mounted
  component keeps it an inline state change; no portal and no `role="dialog"` are used, so nothing
  about it reads as a modal to a user or to assistive technology.

No new violations were introduced by the Phase 1 design.

### Reconciled with the post-plan clarification (2026-09-08)

A second `/speckit-clarify` pass ran after this plan and changed four things. The design is
unaffected in shape; these artifacts were updated in place:

| Change | Effect on this plan |
|--------|---------------------|
| **FR-036** sets the map-session ceiling at 10 minutes | `MAX_MAP_SESSION_SECONDS = 600` is now a specified product behaviour, not a plan-invented safety margin. FR-012's unachievable "never" was reworded. |
| **FR-037** states the undetectable provider-error gap | Research R4's known limitation is now a requirement; FR-013 is narrowed to the detectable class and SC-005 rescoped. [contracts/map-embed.md](contracts/map-embed.md) §3 updated. |
| **FR-035** — no attract-mode exemption | The map dims with the rest of the chrome in both display states. Recorded in [contracts/view-states.md](contracts/view-states.md) §3 so nobody adds a `.recede` opt-out later. |
| **FR-006 / FR-038** — companion rows show walking time | `walkMinutes` becomes **required** in [data-model.md](data-model.md) §1, and rows are single-line to protect no-scroll at 8 entries. |

## Project Structure

### Documentation (this feature)

```text
specs/003-restaurant-map/
├── plan.md              # This file
├── spec.md              # Feature specification (input)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── map-embed.md         # Embed URL, sandboxing, failure semantics
│   ├── view-states.md       # Display states, idle-activity contract
│   └── curated-data.md      # In-repo data shape + editorial parity procedure
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── tabs/
│   ├── registry.ts                     # MODIFIED: one entry added
│   └── restaurant-map/                 # NEW — the entire feature
│       ├── meta.ts                     # TabMeta: id, EN/HU label, icon, accent
│       ├── index.tsx                   # Default export + meta re-export
│       ├── RestaurantMap.tsx           # View states, expand/return, load race
│       ├── RestaurantMap.module.css    # Both display states, no-scroll layout
│       ├── MapEmbed.tsx                # Sandboxed iframe + load/fail detection
│       ├── RestaurantList.tsx          # Numbered companion list + fallback list
│       ├── restaurants.static.ts       # The curated set (hand-authored, ≤8)
│       ├── strings.ts                  # EN/HU feature copy
│       ├── useMapActivity.ts           # Focus-transfer idle bridge + ceiling
│       ├── restaurants.test.ts         # Data invariants (unit)
│       ├── RestaurantMap.test.tsx      # States, fallback, cleanup (unit)
│       └── RestaurantMap.browser.test.tsx  # No-scroll + touch targets (layout)
└── components/
    └── TabNav/
        └── TabNav.module.css           # MODIFIED: registry-driven column count
```

**Structure Decision**: The existing tab-module pattern is used unchanged — every file except two
lives under `src/tabs/restaurant-map/`, matching the contract in
[001's tab-module.md](../001-lobby-kiosk-shell/contracts/tab-module.md). The two modified files are
a single registry entry (the sanctioned extension point) and one CSS line in shared chrome
(justified below). This keeps Principle IX's removability property: deleting the folder and the
registry line removes the feature entirely.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principle VIII (Static-First)**: the map is a live third-party embed, not a static asset | The feature exists to let visitors explore where restaurants are relative to the building. Pan/zoom over real streets (FR-010) is the value; a pre-rendered image cannot provide it. | A static map image was rejected because it eliminates User Story 2 entirely and still fails at the same moment a live map would (a stale image is worse than a fallback that says so). The exception is bounded by FR-013–FR-015: a 5s cap, a static in-repo fallback that always works offline, and automatic recovery on re-entry — so the *worst case* degrades to exactly the static-first behaviour the principle wants. |
| **Shared chrome edit**: `TabNav.module.css` changes `repeat(4, 1fr)` to a registry-driven column count | The registry documents "add one entry below. Nothing else in the codebase changes," but the nav hardcodes four columns. A fifth tab renders wrong without this. | Rejected: adding a 5th column literal (`repeat(5, 1fr)`), because it re-creates the same latent bug for the next feature. Rejected: giving the map a non-nav entry point, because it contradicts the spec's Assumptions (nav entry = "the button on the landing page") and Principle IX's consistency intent. The chosen fix *removes* a coupling rather than adding one, and benefits every future tab. |
| **One added timer** (focus poll, ~1s) while the map tab is mounted | Pointer events inside a cross-origin iframe are invisible to the parent document, so FR-012 cannot be satisfied by the existing document-level listeners. | Rejected: a transparent overlay to capture the first touch, because it would block the map interaction it is meant to detect. Rejected: treating the map as always-active, because that defeats idle reset. Rejected: doing nothing, because the visible failure — resetting a visitor mid-pan — is worse than the timer. The timer is cleared on unmount and ceiling-bounded (Principle V). |
