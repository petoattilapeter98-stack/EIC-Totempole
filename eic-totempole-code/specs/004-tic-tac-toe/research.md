# Phase 0 Research: Fullscreen Tic-Tac-Toe

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Every question below was settled by reading the code or by a throwaway probe test in the `layout`
Vitest project, which runs real Chromium at 1920x1280. Probe files were deleted after each run; this
document keeps their results. Where a probe result is quoted, that is what the browser returned,
not an expectation.

---

## R1 — The game view cannot escape attract dimming from inside its module

**Question**: FR-020 exempts the enlarged game view from attract dimming. Can the tab do that
itself, the way the map chose its own attract behaviour?

**Finding**: No. `App.tsx` passes `.recede` to `ContentRegion`, so the `<main>` element that
contains every tab receives `.attract .recede { opacity: 0.16 }`. Opacity composites the whole
subtree, and no descendant rule can undo it.

> Probe: map expanded, `attractAfterSeconds={1}`, after 3.2s:
> `{"shellAttract":"true","mainOpacity":"0.16","rootOpacity":"1"}`. The panel's own opacity is 1,
> but it renders at 0.16.

**Decision**: Add one shell rule that holds the content region at full opacity while it contains
an enlarged view marked exempt:

```css
.shell:has([data-enlarged-view][data-attract-exempt]) .content { opacity: 1; }
```

The attribute is rendered by the shared `EnlargedView` component (R3) when a feature passes
`attractExempt`. The shell only knows "an exempt enlarged view is present", never which feature.

> Probe: rule injected, exempt attributes set, attract on: `mainOpacity: "1"`. Exempt attribute
> removed: opacity immediately began transitioning back (`0.88` at 50ms), so the map's dimming is
> untouched.

`isAttract` and `data-attract` are **not** changed: the kiosk really is idle, and only its
presentation is exempt. The aurora and the navy ground still switch on behind the opaque view. The
view hides them, and they cost the same as in any other attract period.

**Rationale for presence, not registration**: the exemption exists exactly as long as the exempt
element is in the DOM. When the 60s idle reset unmounts the tab, the element goes and the kiosk is
in attract mode on the next frame. No state has to be released, so no bug can leave the kiosk
exempt forever.

**Alternatives considered**:
- *`KioskContext` registration* (`claimEnlargedView()` returning a release function): works, but it
  adds ownership tokens, a cleanup path whose failure is silent, and a shell-wide re-render per
  change. Rejected in favour of the stateless rule. This was the first design and is recorded in
  the plan's post-Phase-1 re-evaluation.
- *Portal the view to `document.body`*: escapes `<main>`, but leaves the feature's React subtree,
  which the map's contract forbids (003 `view-states.md` S2, Principle IV).
- *Call `signalActivity()` continuously while the view is open*: keeps attract off, but also
  pushes back the idle reset forever, breaking FR-018.
- *Suppress `isAttract` in context while exempt*: loses the truth that nobody is touching the
  kiosk. Any future consumer (a paused video, say) would be misled.

---

## R2 — The expanded map does not cover the footer (feature 003 defect)

**Question**: FR-003 requires the game view to fill the entire viewport, "matching the map's
expanded state". Does the map's expanded state actually do that?

**Finding**: Not completely. `.recede` gives `<main>` `position: relative; z-index: 1`, which makes
it a stacking context, so the expanded panel's `z-index: 20` only competes inside `<main>`. The
footer wrapper is also `.recede` (`z-index: 1`) and comes **after** `<main>` in the DOM, so it
paints on top of the "full-viewport" map. Header, hero and nav come before `<main>`, so they are
covered correctly.

> Probe: map expanded, `elementFromPoint` at four points. footerCentre: `insideExpanded: false`;
> header, nav and middle: `insideExpanded: true`.

The map's layout test "covers the whole viewport when expanded (FR-024)" asserts the panel's
bounding box, which is the full viewport, and not what paints over it, so it passes.

**Decision**: Add a second shell rule that raises the content region above the other rows while
any enlarged view is present:

```css
.shell:has([data-enlarged-view]) .content { z-index: 2; }
```

> Probe: rule injected. footerCentre: `footerCoveredByView: true`.

Both the map and the game get the fix through `EnlargedView` (R3). The map's layout test gains a
paint-order assertion (`elementFromPoint` at the footer), so the defect cannot come back unnoticed.

**Alternatives considered**:
- *Raise `<main>` permanently*: `<main>` would then overlap the hero's attract-mode `scale(1.03)`
  transform on every tab, for a problem that only exists while a view is enlarged.
- *Move the footer out of the grid*: the footer's position is constitutional (001 FR-017: the
  countdown is never pushed off-screen by content). Rejected.

---

## R3 — One shared enlarged view, with the map migrated onto it

**Question**: FR-004 requires the game's return control to match the map's in placement, size and
visual treatment. FR-027 forbids either feature taking it from the other. Where does it live?

**Decision**: A new shared component, `src/components/EnlargedView/`, owns everything the two
views must have in common:

- the fixed full-viewport panel (`position: fixed; inset: 0`, padding, surface background);
- the `data-enlarged-view` and optional `data-attract-exempt` attributes the shell rules key on (R1, R2);
- the return control's geometry, icon (`Minimize2`) and styling, moved as-is from the map's expanded
  `.stateToggle`, so the map's appearance does not change;
- moving focus to the return control on mount (003 S6).

Features pass `active`, the return label, the `onReturn` callback, the `attractExempt` flag and
their own content. `EnlargedView` is rendered in **both** states and `active` toggles it: inactive,
it is a `display: contents` wrapper with no attributes and no return control. Rendering it only
while enlarged would move the caller's children to a new parent, and React would recreate them. The
map's iframe would reload on every expand and collapse, losing pan and zoom and restarting the load
race. This hazard was found while breaking the migration into tasks, and is contract rule E10. Restoring focus to the opener after closing stays with each feature, because the opener
only re-renders once the feature's own state has changed (the map's existing `pendingFocus`
pattern). The full API is in [contracts/enlarged-view.md](contracts/enlarged-view.md).

The restaurant map is migrated in the same change. Its expand control stays in its map area. The
collapse control comes from `EnlargedView` instead of a swapped ref on the same button. It passes
no `attractExempt`, so the map keeps dimming (003 FR-035).

**Rationale**: two views that "match" by copy drift apart silently. A shared component makes FR-004
true by construction, and the map's full existing suite guards the migration.

**Alternatives considered**:
- *Duplicate the CSS in the game*: drift. Rejected.
- *Import `RestaurantMap.module.css` from the game*: cross-feature coupling (Principle IX).
- *Share a CSS file but no component*: the attributes, focus behaviour and return control markup
  would still be duplicated.

**Sequencing**: this is a fix to unmerged feature 003. It lands as its own first commit so it can be
cherry-picked onto `feature/mappage`. Feature 003's `contracts/view-states.md` §1 should then point
at the shared contract. That doc edit is tracked as a task, not made during planning.

---

## R4 — Rules as a pure function over the board, verified exhaustively

**Decision**: `game.ts` holds pure, framework-free rules. The **board is the only stored state**:
nine cells in row-major order, each `'X' | 'O' | null`. Everything else is derived by
`evaluate(board)`: whose turn it is, win or draw, and which cells won. Turn = X when the X and O
counts are equal, else O.

Storing `turn` or `status` alongside the board would make contradictory states representable, such
as "X's turn" on a board where X has just won. Deriving them makes those states impossible.

The reducer has two actions:
- `place(index)` returns the **same board reference** when the move is illegal: occupied cell, game
  over, or index out of range. React then skips the re-render, and FR-009/FR-015's "changes nothing"
  holds exactly.
- `newGame` returns the shared empty board.

**Verification (SC-002)**: `game.test.ts` walks every position reachable from the empty board by
legal moves, stopping at terminal positions, and asserts:
1. there are exactly **5,478** distinct positions, including the empty board;
2. for every position, `evaluate` agrees with an independently written oracle (bitmask line checks,
   not the production `WIN_LINES` table);
3. the invariants in [contracts/game-rules.md](contracts/game-rules.md) §4 hold;
4. `place` is a no-op on every occupied cell of every position and on every cell of every terminal
   position.

This takes well under a second in the unit project.

**Alternatives considered**:
- *`useState` for board, turn and status separately*: the contradictory states above become possible.
- *Hand-picked test cases*: they would miss the double-line win and "win on the ninth move" cases
  that the spec calls out, unless someone remembered to add them.

---

## R5 — Input: commit on `pointerdown`, board-scoped multi-touch rule, keyboard via `click`

**Question**: How does a tap place a mark instantly (SC-004), ignore a second simultaneous touch
(FR-010), and still work with a keyboard and a screen reader (FR-022)?

**Decision**:

1. **Pointer input commits on `pointerdown`** on a cell, for touch and pen, and for mouse with the
   primary button only. There is no click delay and no press-then-slide ambiguity.
2. **Multi-touch rule, scoped to the board**: `useBoardInput` keeps a `Set` of pointer IDs currently
   down on the board. A `pointerdown` that arrives while the set is non-empty is added to the set
   but **does not commit**. IDs leave the set on `pointerup`, `pointercancel` and
   `lostpointercapture`.
3. **Every accepted pointer is captured** with `setPointerCapture` on `pointerdown`, so its
   `pointerup` returns to the board even if the finger slides off. Without capture, a mouse released
   outside the board (in development) would leave a stale ID in the set, and every later touch
   would be ignored forever.
4. **Keyboard and assistive-tech activation commits on `click` when `event.detail === 0`.**
   Pointer-originated clicks (`detail ≥ 1`) are ignored, because their `pointerdown` already
   committed the move.

> Probe (real Chromium input via `@vitest/browser/context`):
> `["pointerdown:mouse", "click:detail=1:ctor=PointerEvent", "click:detail=0" (Enter),
> "click:detail=0" (Space), "click:detail=0" (element.click())]`

`pointerdown` still bubbles to `document`, so every move restarts the idle countdown through the
existing listener (FR-019). The game needs no activity bridge.

**Alternatives considered**:
- *`PointerEvent.isPrimary`*: false for any touch that begins while another touch is down
  **anywhere on the screen**. A player resting a hand on the side panel, or leaning on the display,
  could then not play, with no feedback why. FR-010 scopes the rule to the board. Rejected.
- *Commit on `click` only*: pointer clicks fire after release and cannot tell a second simultaneous
  finger from a first, because both produce clicks. Rejected.
- *Handle `keydown` Enter/Space instead of `click`*: screen readers (Narrator on the Surface Hub)
  activate buttons by dispatching `click` with no key events, so this would silently break
  FR-022. Rejected.

**Device check**: multi-touch cannot be simulated faithfully in either test project.
[quickstart.md](quickstart.md) §2.3 covers it by hand on the hardware.

---

## R6 — Discarding the game on leave and on idle comes from unmounting

**Decision**: No reset logic. `GameBoard` owns the reducer and mounts only while `TicTacToe` is in
its `enlarged` display state.

- **Leaving by the return control** switches to `default`, which unmounts `GameBoard` and discards
  the board (FR-017). The next Play mounts a fresh reducer with the empty board (FR-002).
- **Idle reset** sets the active tab to `board-agenda`. `ContentRegion` is keyed on `activeTab`, so
  the whole tab unmounts: display state, board and the enlarged view's DOM go with it (FR-018). This
  is the same property feature 003 relies on (003 research R6).

**Alternatives considered**: lifting game state into `KioskContext` so a reset can clear it explicitly
adds cross-feature state for a guarantee the component tree already gives, and would violate
Principle IX's "removable as one folder".

---

## R7 — Six navigation tabs fit in both languages

**Question**: FR-029 requires six tabs on one row with no truncated label. `.label` truncates with
an ellipsis, so an overflowing label would fail quietly rather than wrap.

**Finding** (probe: current nav at 1920x1280, fonts loaded, width needed per tab = label's natural
width + icon 20px + gap + padding + border, compared with the six-column width
`(1840 − 5×16) / 6 = 293px`):

| Locale | Tightest label | Needs | Headroom at 293px |
|--------|----------------|-------|-------------------|
| en | COMPANY HIGHLIGHTS | 241px | 52px |
| hu | TESTÜLETI NAPIREND | 233px | 60px |

Candidate sixth labels, same styling: `Tic-Tac-Toe` 93px, `Amőba 3×3` 88px. Either needs about 170px.

**Decision**: No nav change is needed. The layout test asserts, for every tab in both locales, that
the label's `scrollWidth` ≤ `clientWidth`, so a later, longer label fails the build rather than
truncating on the device.

---

## R8 — Accessibility semantics

**Decision**:
- **Cells are nine `<button type="button">` in row-major DOM order** inside a labelled group
  (`role="group"`, localized name "Game board"). **Not `role="grid"`**: an ARIA grid promises
  arrow-key navigation and a roving tabindex that this board does not need. Tab order through nine
  buttons is short and predictable.
- **Accessible name per cell** = position + contents, plus a suffix for cells on a winning line:
  "Row 1, column 2, empty" / "Row 1, column 2, X" / "Row 1, column 2, X, winning line".
- **Unavailable cells use `aria-disabled="true"`, never `disabled`.** A `disabled` button loses
  focus when the game ends under it, and focus falls back to `<body>`, stranding a keyboard user.
  `aria-disabled` keeps focus and announces the state. The reducer ignores the move either way (R4).
- **One persistent `role="status"` element** holds the turn or result text. It is rendered once and
  its text is replaced, never re-inserted, because screen readers ignore live regions that appear
  already filled.
- **Focus**: opening moves focus to the return control (`EnlargedView`, matching the map). Closing
  returns focus to Play. No trap.

---

## R9 — Tab identity

**Decision**:

| Field | Value | Why |
|-------|-------|-----|
| `id` | `tic-tac-toe` | Equals the folder name (001 tab-module contract). |
| `label.en` | `Tic-Tac-Toe` | |
| `label.hu` | `Amőba 3×3` | "Amőba" alone suggests five-in-a-row on a large grid (spec Assumptions); "3×3" says which game this is. **Pending native-speaker review**: an editorial change that fits either way (R7), not a design dependency. |
| `icon` | `Grid3x3` | Present in the installed lucide-react. It reads as the board itself at nav size. |
| `accent` | `blue` | The only unused accent. `--accent-blue` is 3.27:1 on white, which is valid for **UI graphics and large text only** (tokens.css). This feature uses the accent only for the nav icon and decorative board chrome, never body text. Mark and status colours are chosen separately (R10). |

---

## R10 — Marks, colours and the winning cue

**Decision**:
- **X** is lucide `X` in `--brand-blue-ink` (#00688F, 6.22:1 on white). **O** is lucide `Circle`
  in `--brand-orange-ink` (#A85400, 5.34:1). Shape is the primary difference and colour the second.
  Both inks exceed the 3:1 minimum for graphical objects and even the 4.5:1 text minimum.
- **Status text** uses `--color-text` (navy, 17.85:1). **Text only, no icon beside it**: an icon
  there was tried and then removed as a post-implementation correction (2026-09-14) — the status
  template already spells the mark out as a letter ("X's turn"), so an icon duplicated it rather
  than adding information. See [contracts/view-states.md](contracts/view-states.md) A6.
- **Winning cells** get a 6px inset ring in `--color-text` plus a `--brand-orange-soft` fill. The
  ring is the non-colour cue required by FR-013. Cells on more than one completed line get the same
  single treatment, so a double-line win highlights the union of cells.
- **Board surface**: `touch-action: manipulation` and `user-select: none`, so a quick double tap
  can't zoom the page or select text on the touchscreen.

**Alternatives considered**: a strike-through line drawn across the winning cells is the classic
cue, but a double-line win needs two lines, and a diagonal line needs geometry the per-cell ring
avoids.
