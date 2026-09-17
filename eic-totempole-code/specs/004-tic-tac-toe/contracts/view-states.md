# Contract: View States, Input & Presentation

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R5–R10 | **Shared view**: [enlarged-view.md](enlarged-view.md) | **Rules**: [game-rules.md](game-rules.md)

This covers what the visitor sees and touches. The input rules in §3 are the ones most likely to be
"simplified" into a bug, and each one has a reason written beside it.

---

## 1. Display states

| State | Where | Contents | Controls |
|-------|-------|----------|----------|
| `default` | Content region; header, hero, nav and footer visible | `h2` "Tic-Tac-Toe" (matches the nav label), one-line introduction, decorative `Grid3x3` illustration (`aria-hidden`) | **Play** |
| `enlarged` | `<EnlargedView active attractExempt>` covering the viewport | Board, status, marks | **New game**, nine cells, return control (from `EnlargedView`) |

### Rules

| ID | Rule | Requirement |
|----|------|-------------|
| V0 | The feature is a nav destination (sixth, per `registry.ts`) whose `default` view shows the heading, introduction and Play, with header, hero, nav and footer visible. Reaching the board takes exactly two taps from any destination: the nav tab, then Play. | FR-001, FR-028, SC-001 |
| V1 | `default` on every mount. `enlarged` never persists across entries. | FR-002, FR-018 |
| V2 | `GameBoard` mounts only in `enlarged`. Leaving unmounts it, and the game is discarded. There is no reset code (research R6). | FR-017, FR-018 |
| V3 | Play opens `enlarged`, which always has an empty board with X to move, because a new mount means a new reducer. | FR-002 |
| V4 | Return label: "Close game" / "Játék bezárása", matching the map's "Close enlarged map" pattern. | FR-004, FR-021 |
| V5 | On return, focus goes to Play after the `default` render. Opening focus comes from `EnlargedView` E7. | FR-007 |
| V6 | The `default` view has **no** attract exemption: it dims like every other destination. Only `EnlargedView` carries `data-attract-exempt`. | FR-020 |
| V7 | From `default`, any nav tab leaves directly. Nothing intercepts navigation. | FR-030 |
| V8 | The tab renders an `h2` naming itself, like every other tab. `registry.test.tsx` asserts this for all tabs. | 001 tab-module contract |

## 2. Game view layout (1920x1280)

**Post-implementation correction (2026-09-14)**: manual review after `/speckit-implement` found the
board pinned to the left edge with the side panel stretched across the remaining width, and a mark
icon rendered beside the status text that duplicated what the text already said (e.g. a ✕ glyph next
to the words "X's turn"). Neither was ever a deliberate design decision — both were just how the
first CSS pass happened to come out — so this is recorded here as a contract fix, not a new
requirement: **L1** and **A6** below are corrected in place, and the two paragraphs replace what
this section and A6 said before. No functional requirement changes: FR-011 only requires the mark to
be named *in text*, which the icon's removal does not touch.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ padding (EnlargedView)                                      [⤡ Close game]   │
│                                                                                │
│              ┌──────────────────────┐                                        │
│              │ cell │ cell │ cell │ │        X's turn                         │
│              │──────┼──────┼──────│ │                                         │
│              │ cell │ cell │ cell │ │  square, full                           │
│              │──────┼──────┼──────│ │  height           [ ↺  New game ]       │
│              │ cell │ cell │ cell │ │                                         │
│              └──────────────────────┘                                        │
│                       ── board + side panel centred as one unit ──           │
└──────────────────────────────────────────────────────────────────────────────┘
```

| ID | Rule | Requirement |
|----|------|-------------|
| L1 | The board and the side panel are centred as one unit in the panel (a `flex` row, `justify-content: center`), not a grid spanning the full width. The board is a square whose side is the panel's content height (~1232px) with 16px cell gaps, giving ~400px cells; the side panel is sized to its own content, immediately beside the board, not stretched to fill remaining width. | FR-008, FR-024 |
| L2 | The side panel is centred vertically and keeps clear of the return control's box. Status and New game never sit under it. | FR-004 |
| L3 | Every flexible box has `min-width: 0` / `min-height: 0`. Status text wraps rather than overflowing. The longest string in either locale must fit (§6). | FR-023, Principle II |
| L4 | New game uses `--touch-target-min` height and padding, at least 16px from any other target. | FR-024 |

## 3. Input rules (`useBoardInput.ts`)

| ID | Rule | Why |
|----|------|-----|
| N1 | A cell's move commits on **`pointerdown`**, for `pointerType` touch or pen, and for mouse only when `button === 0`. | SC-004: no wait for release. |
| N2 | The hook keeps `activePointers: Set<number>` scoped to **the board element**. A `pointerdown` that finds the set non-empty is added to the set but **does not commit**. | FR-010. Board-scoped, not `isPrimary`: a hand resting elsewhere on the screen must not block play (research R5). |
| N3 | Every `pointerdown` on the board calls `setPointerCapture(pointerId)` on the board element. IDs are removed on `pointerup`, `pointercancel` and `lostpointercapture`. | Without capture, a release outside the board leaves a stale ID and **every later touch is ignored forever**. That would be a Principle V failure, and a silent one. |
| N4 | A cell's `click` commits **only when `event.detail === 0`**, which is keyboard Enter/Space or assistive-technology activation. Clicks with `detail ≥ 1` are ignored. | FR-022: Narrator activates by `click` with no pointer events. Ignoring pointer clicks stops a move being placed twice. Verified in Chromium (research R5). |
| N5 | Whatever the input, the hook only dispatches `place(index)`. Legality is entirely `gameReducer`'s job (G6/G7), so input code never checks occupancy or game over. | One source of truth. |
| N6 | The hook does not call `preventDefault` or `stopPropagation` on `pointerdown`. The event must reach `document` so the idle countdown restarts (FR-019). | The kiosk's idle listener is on `document`. |
| N7 | Board styles set `touch-action: manipulation; user-select: none`. | No double-tap zoom and no text selection on touch. |

## 4. Accessibility and announcements

| ID | Rule | Requirement |
|----|------|-------------|
| A1 | The board is `role="group"` with a localized accessible name ("Game board" / "Játéktábla"). **Not** `role="grid"`, because that promises arrow-key navigation (research R8). | FR-022 |
| A2 | Each cell is `<button type="button">`, named `"{row label}, {column label}, {contents}"`, plus the winning suffix when in `winningCells` (§6). | FR-022, FR-013 |
| A3 | An occupied cell, and every cell once the game has ended, has `aria-disabled="true"`. **Never the `disabled` attribute**: it would drop focus to `<body>` when the game ends under a focused cell. | FR-022, Principle VII |
| A4 | One `role="status"` element is rendered for the whole life of `GameBoard`. Only its text changes. It shows the turn (`playing`) or the result (`won` / `draw`), never both. | FR-011, FR-013, FR-014 |
| A5 | Mark icons are `aria-hidden`. Their meaning is carried by cell names and status text. | FR-022 |
| A6 | The status line is **text only** — no mark icon beside it. `s.turn(mark)` / `s.wins(mark)` already spell the mark out as a letter; an icon there duplicated the same information rather than adding to it (2026-09-14 correction, above). Mark icons remain on the board cells (A2) and are `aria-hidden` there. | FR-011 |

## 5. Visual treatment

| Element | Treatment | Contrast |
|---------|-----------|----------|
| X | lucide `X`, `--brand-blue-ink` #00688F | 6.22:1 on white |
| O | lucide `Circle`, `--brand-orange-ink` #A85400 | 5.34:1 on white |
| Cell | `--color-surface` with `--color-border` outline | Border is decorative; the cell is identified by its content and name |
| Winning cell | 6px inset ring in `--color-text` + `--brand-orange-soft` fill | Ring 17.85:1. The ring is the non-colour cue (FR-013). |
| Status text | `--color-text`, display font, `--text-4xl` | 17.85:1 |
| Tab accent (`blue`) | Nav icon, decorative intro illustration, return-control icon only | 3.27:1, UI graphics only (research R9) |

## 6. Strings (`strings.ts`)

Hungarian copy is **pending native-speaker review** (spec Assumptions). Layout tests run against
these values, so any revision must keep passing §7.

| Key | en | hu |
|-----|----|----|
| `heading` | Tic-Tac-Toe | Amőba 3×3 |
| `intro` | Two players, one screen. Get three in a row to win. | Két játékos, egy képernyő. Három egy sorban nyer. |
| `play` | Play | Játék indítása |
| `close` | Close game | Játék bezárása |
| `newGame` | New game | Új játék |
| `boardName` | Game board | Játéktábla |
| `turn` | {mark}'s turn | {mark} következik |
| `wins` | {mark} wins! | {mark} nyert! |
| `draw` | It's a draw! | Döntetlen! |
| `row` / `column` | Row {n} / column {n} | {n}. sor / {n}. oszlop |
| `empty` | empty | üres |
| `winningLine` | winning line | nyerő vonal |

`{mark}` is always the literal `X` or `O`. Nav `label` in `meta.ts` equals `heading`.

## 7. Test obligations

| Test | Project | Asserts |
|------|---------|---------|
| `GameBoard.test.tsx` | unit | Alternating turns from X; occupied tap ignored (N5/G7); X, O and draw results with status text; winning cells named with the suffix; all cells `aria-disabled` after the end and never `disabled` (A3); focus survives the game ending on a focused cell; the status element keeps its identity across moves (A4); New game mid-game and after a result; **N2**: second concurrent pointer ignored via user-event pointer API; **N3**: IDs cleared on `pointercancel` and `lostpointercapture`, so a later tap commits; **N4**: `click` with `detail: 1` does not commit, `detail: 0` does. |
| `TicTacToe.test.tsx` | unit | **SC-001**: starting from each of the other five destinations, one tap on the Tic-Tac-Toe tab plus one tap on Play shows an empty board with X to move; V1 default on mount; Play → board empty, X to move; return → `default` and focus on Play (V5); reopen → empty board (V2, V3); idle reset through `KioskProvider` with a short `idleTimeoutSeconds` → Board Agenda active, and reopening shows an empty board (FR-018); `data-attract-exempt` present only in `enlarged` (V6); no timers remain after 20 open/close cycles. |
| `TicTacToe.browser.test.tsx` | layout | No overflow in `default`, `enlarged` empty, mid-game, X wins, draw — **both locales**; every cell, New game, Play and return ≥64px with ≥16px gaps; six nav tabs, and every label `scrollWidth ≤ clientWidth` in both locales (R7); footer covered while enlarged; `attractAfterSeconds={1}`: `<main>` opacity `1` in `enlarged` and `0.16` in `default` (SC-011); real keyboard Enter on a focused cell places a mark (N4); map and game return-control rects equal (E5). |
| `registry.test.tsx` | unit | Six tabs in FR-028 order, ending `restaurant-map`, `tic-tac-toe`. |
| `TabNav.test.tsx` | unit | End and wrap-around now land on "Tic-Tac-Toe". |
