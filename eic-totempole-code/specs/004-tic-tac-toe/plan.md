# Implementation Plan: Fullscreen Tic-Tac-Toe

**Branch**: `feature/tic-tac-toe` (spec directory `004-tic-tac-toe`, branched from `feature/mappage`) | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-tic-tac-toe/spec.md`

## Summary

Add a sixth kiosk destination: a short introduction and a **Play** control that opens a two-player
Tic-Tac-Toe game in a full-viewport view matching the restaurant map's expanded state. The game is
fully static, adds no dependencies and no timers, and keeps all of its state in memory for as long
as the game view is mounted.

The game itself is the easy part. Its rules are a pure function over a nine-cell board, and they
are small enough to verify exhaustively against all 5,478 reachable positions (SC-002). What shapes
this plan is what reading the shell and probing it in real Chromium turned up:

1. **The game view cannot opt out of attract dimming from inside its own module.** Attract mode
   sets `opacity: 0.16` on the content region `<main>` itself, and no descendant can undo an
   ancestor's opacity. Probed: the expanded map computes `opacity: 1` on itself and still renders
   at 0.16. FR-020 therefore needs a rule in the shell (research R1).
2. **The expanded map does not actually cover the footer.** `<main>` is a stacking context at
   `z-index: 1`, and the footer wrapper after it in the DOM has the same z-index, so the panel's
   `z-index: 20` is confined. Probed: `elementFromPoint` at the footer's centre returns the footer,
   not the expanded map. The map's existing layout test measures the panel's size, not what is
   painted on top of it, so it passes. The game would inherit this defect (research R2).
3. **Both problems have a shared-chrome fix.** Two `:has()` rules in `App.module.css`, keyed on
   data attributes that a new shared `EnlargedView` component renders, raise the content region
   above the other shell rows. Where a view opts in, they also exempt it from attract dimming. The
   shell never learns which feature is enlarged. Probed in Chromium: with the rules, the footer is
   covered and `<main>` holds `opacity: 1` during attract; without the opt-in attribute, the map
   keeps dimming (research R1–R3).

Because FR-004 requires the game's return control to match the map's, and FR-027 forbids either
feature borrowing from the other, the enlarged view becomes a shared component that both use. The
restaurant map is migrated onto it in this change, which also fixes the map's footer defect.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: react, react-dom, lucide-react. **No new dependencies.** `Grid3x3`, `X`, `Circle`, `Minimize2` and `RotateCcw` are all present in the installed lucide-react (verified against its type declarations).

**Storage**: N/A. Game state lives in memory only while the game view is mounted; nothing is persisted or transmitted (FR-025).

**Testing**: Vitest 3, two projects. `unit` (jsdom) covers the rules (exhaustive), reducer, components, focus and announcements. `layout` (real Chromium at 1920x1280) covers no-scroll, touch targets, the six-tab nav, what paints over the footer, attract opacity and real keyboard input.

**Target Platform**: Chromium (Edge) on Microsoft Surface Hub 2S, 1920x1280 CSS px, touch-only, multi-day uptime. `:has()` requires Chromium 105+, which the device's browser exceeds.

**Project Type**: Static single-page application (Vite, `dist/` static output). No server component.

**Performance Goals**: A mark, turn change or result renders within 0.1s of the tap (SC-004). Moves commit on `pointerdown` and cause a single state update. **Zero timers and zero document listeners are added** by the game or by `EnlargedView`.

**Constraints**: No page scroll in any state or locale. ≥64px targets with ≥16px separation. No route, modal, portal or `role="dialog"`. No unbounded state. Works offline.

**Scale/Scope**: 1 new tab module (~10 files); 1 new shared component; 6 nav entries; shell CSS +2 rules; restaurant map migrated onto the shared component.

No unknowns remain. Every open technical question was settled by reading the code or by a
throwaway probe in the `layout` project. The probes were deleted after use, and their results are
recorded in [research.md](research.md).

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design.*

| # | Principle | Verdict | How this design satisfies it |
|---|-----------|---------|------------------------------|
| I | Kiosk-First Hardware Target | **PASS** | Verified only at 1920x1280. No hover-revealed state: turn, result and winning cells are always visibly rendered. Keyboard and assistive-tech activation work (R5) but are never required. |
| II | Fixed 3:2 Viewport, No Scroll | **PASS** | Bounded by construction: nine cells, one status line, two controls. The board is a square sized from the available height, and the enlarged view is `position: fixed; inset: 0` inside a shell with `overflow: hidden`. The layout test asserts no overflow in every state, in both locales, including the longest result string. |
| III | Minimum Touch Target Sizing | **PASS** | Cells are ~400px square with 16px gaps. Play, New game and return use `--touch-target-min` / `--touch-gap-min`. Six nav tabs measure 293px wide each, and the tightest label still has 52px spare (R7). |
| IV | Single-Page, Inline-Only Updates | **PASS** | The game view is an inline `position: fixed` state inside the tab's React subtree: no portal, no `<dialog>`, no `role="dialog"`, no focus trap. No confirmation dialog exists for New game or leaving (spec Assumptions). |
| V | Unattended Multi-Day Reliability | **PASS** | No timers, intervals or document listeners are added. The board's active-pointer set is bounded by the number of fingers on the board, cleared on `pointerup` / `pointercancel` / `lostpointercapture`, and captured so a release can never be missed (R5). The attract exemption is DOM-presence-based, so it cannot outlive the view, and the 60s idle reset bounds it (R1). |
| VI | Zero Secrets in the Client Bundle | **PASS** | No network access of any kind, which also satisfies FR-026 (works offline, no external service). Verified by quickstart §2.9 with networking disabled. |
| VII | Accessibility Baseline | **PASS** | Cells are real `<button>`s named by position and contents. Unavailable cells use `aria-disabled` (not `disabled`), so focus is never dropped. Turn and result go to a persistent `role="status"` region. Focus moves on open and close. X and O differ by shape and by ≥5:1 ink colours; the winning cue is a navy ring, not colour alone (R8, R10). |
| VIII | Static-First Delivery | **PASS** | Entirely static, with no third-party dependency. |
| IX | Modular Feature Isolation | **PASS, with a shared-capability extraction** | The game lives in `src/tabs/tic-tac-toe/` and reads only public `useKiosk()` state. The enlarged view it shares with the map becomes `src/components/EnlargedView/`, which both features depend on explicitly. The shell's two rules key on generic data attributes and name no feature. Deleting the folder and its registry line removes the game. See Complexity Tracking. |

**Gate result: PASS.** No violations. Two shared-code changes are recorded under Complexity Tracking.

### Post-Phase-1 re-evaluation

Re-checked after the contracts were written. **Still PASS.** The design changed in two places, and
both tightened compliance:

- **Principle V.** The first design registered the enlarged view in `KioskContext` from an effect.
  That works, but an ownership bug or a missed cleanup would leave the kiosk permanently exempt from
  attract mode, and nothing would show it. The contract now derives the exemption from the
  attribute's presence in the DOM ([contracts/enlarged-view.md](contracts/enlarged-view.md) §2).
  An unmounted view cannot leave state behind, so there is nothing to release.
- **Principle VII.** Moves commit on `pointerdown` for speed (SC-004). A pointer-only handler would
  have silently broken screen-reader activation, which dispatches a `click` with no pointer events.
  The contract now also accepts `click` when `detail === 0`; real Chromium sends that for Enter,
  Space and programmatic activation, and pointer clicks (`detail ≥ 1`) are ignored so no move is
  placed twice ([contracts/view-states.md](contracts/view-states.md) §3).

## Project Structure

### Documentation (this feature)

```text
specs/004-tic-tac-toe/
├── plan.md              # This file
├── spec.md              # Feature specification (input)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── enlarged-view.md     # Shared full-viewport capability: shell rules, API, map migration
│   ├── game-rules.md        # Board, win lines, status evaluation, move semantics
│   └── view-states.md       # Tab views, input rules, focus, announcements, layout
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── App.module.css                  # MODIFIED: +2 :has() rules (lift, attract exemption)
├── components/
│   ├── EnlargedView/                   # NEW — shared full-viewport capability
│   │   ├── EnlargedView.tsx            # Fixed panel, data attributes, return control, focus on open
│   │   ├── EnlargedView.module.css     # Panel + return-control geometry (moved from the map)
│   │   └── EnlargedView.test.tsx       # Attributes, focus, no-remount on toggle (unit)
│   └── TabNav/
│       └── TabNav.test.tsx             # MODIFIED: End/wrap now land on Tic-Tac-Toe
├── tabs/
│   ├── registry.ts                     # MODIFIED: sixth entry
│   ├── registry.test.tsx               # MODIFIED: six tabs in order
│   ├── restaurant-map/                 # MODIFIED — migrated onto EnlargedView
│   │   ├── RestaurantMap.tsx           # Map area wrapped in <EnlargedView active={isExpanded}>
│   │   ├── RestaurantMap.module.css    # Expanded-panel + collapse styles removed
│   │   ├── RestaurantMap.test.tsx      # + iframe not remounted across expand/collapse
│   │   └── RestaurantMap.browser.test.tsx  # + footer paint check, rect unchanged, six tabs
│   └── tic-tac-toe/                    # NEW — the entire feature
│       ├── meta.ts                     # id, EN/HU label, Grid3x3 icon, blue accent
│       ├── index.tsx                   # Default export + meta re-export
│       ├── TicTacToe.tsx               # Default view (intro + Play) ⇄ enlarged game view
│       ├── TicTacToe.module.css        # Both views: intro, board, marks, side panel
│       ├── GameBoard.tsx               # Board, status region, New game; owns the reducer
│       ├── useBoardInput.ts            # pointerdown commit, multi-touch rule, keyboard/AT click
│       ├── game.ts                     # Pure rules: WIN_LINES, evaluate, applyMove, reducer
│       ├── strings.ts                  # EN/HU copy
│       ├── game.test.ts                # Exhaustive 5,478-position verification (unit)
│       ├── GameBoard.test.tsx          # Turns, results, New game, multi-touch, a11y (unit)
│       ├── TicTacToe.test.tsx          # Open/close, focus, discard on leave and idle (unit)
│       └── TicTacToe.browser.test.tsx  # No-scroll, targets, six tabs, attract, keyboard (layout)
```

**Structure Decision**: The existing tab-module pattern is used unchanged for the game. The one
new shared module goes in `src/components/`, next to the other shared chrome. Outside the new
folders the edits are a registry entry, two tab-order test expectations, two CSS rules in the shell
and the map's migration. `KioskContext` and `useIdleReset` are **not** modified: the game needs no
activity bridge (touches on the board reach `document`) and no reset logic (unmounting discards
state, R6).

## Complexity Tracking

| Change to shared code | Why Needed | Simpler Alternative Rejected Because |
|-----------------------|------------|-------------------------------------|
| **Shell CSS: two `:has()` rules** in `App.module.css`: raise the content region above the other rows while an enlarged view is present, and hold it at full opacity during attract when that view is marked exempt | FR-020 cannot be met inside the tab: attract dims `<main>` itself, and a descendant cannot undo an ancestor's opacity (probed). FR-003 cannot be met either: `<main>`'s stacking context confines any z-index, so the footer paints over the view (probed). | *CSS inside the tab*: impossible for the reason above. *A portal to `body`*: escapes both problems but leaves the feature's subtree, which the map's contract forbids (003 S2, Principle IV). *Calling `signalActivity` continuously to keep attract off*: also suppresses the idle reset, breaking FR-018. *Registering the enlarged view in `KioskContext`*: works, but it adds lifecycle state that could leak and pin the kiosk out of attract mode, and it re-renders the whole shell on each change. The attribute-presence rule has none of these risks (R1). |
| **New shared component `EnlargedView`, with the restaurant map migrated onto it** | FR-004 requires the game's return control to match the map's in placement, size and treatment. FR-027 and Principle IX forbid either feature taking it from the other. The footer defect has to be fixed for both views, and a shared component is the one place to do that. | *Copy the map's CSS into the game*: the two drift apart silently, and FR-004 fails the first time either one is restyled. *Import the map's styles from the game*: cross-feature coupling, which Principle IX forbids. *Leave the map alone*: the map keeps the footer defect, and there are two return controls that only happen to match. The migration is covered by the map's existing 21 unit and 7 layout tests, plus a new footer-coverage assertion. |

**Sequencing note.** The `EnlargedView` extraction and the map migration fix a defect in feature
003, which is still unmerged on `feature/mappage`. Landing them as the first, self-contained commit
on this branch keeps them cherry-pickable onto `feature/mappage`, so the map can ship with the fix
whether or not the game ships.
