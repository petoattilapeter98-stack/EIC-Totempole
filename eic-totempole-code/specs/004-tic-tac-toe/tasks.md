---

description: "Task list for the Fullscreen Tic-Tac-Toe feature"
---

# Tasks: Fullscreen Tic-Tac-Toe

**Input**: Design documents from `/specs/004-tic-tac-toe/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The contracts define test obligations explicitly: [enlarged-view.md](contracts/enlarged-view.md) §5, [game-rules.md](contracts/game-rules.md) §5 and [view-states.md](contracts/view-states.md) §7. Constitution Quality Gates also require test evidence for Principles II, III and V. Within each phase, write the tests first and confirm they **fail** before implementing.

**Organization**: Tasks are grouped by user story so each can be implemented, tested and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file it touches

## Path Conventions

Single static SPA at the repository root (`eic-totempole-code/`). Tests sit beside the code they
cover: `*.test.ts[x]` runs in the `unit` project (jsdom), and `*.browser.test.tsx` runs in the
`layout` project (real Chromium at 1920x1280). Run a single file with
`npx vitest run --project unit <path>` or `npx vitest run --project layout <path>`.

## 🖐 Manual tasks

Tasks marked 🖐 need the real device or a person. They are **not optional**. They cover real
multi-touch (FR-010), Narrator (FR-022), offline operation (FR-026), the soak (SC-008), the hallway
test (SC-009) and the Hungarian copy, none of which either test project can verify faithfully.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A known-green baseline, and the one measurement that must be taken before any shared code moves.

- [X] T001 Confirm the baseline on branch `feature/tic-tac-toe` using the scripts in `package.json`: `npm run typecheck`, `npm run test:unit` (121 tests at planning time) and `npm run test:layout` (13 tests at planning time) all pass. **Stop and report if anything fails**, because later tasks assume a green start
- [X] T002 [P] Create the empty directories `src/components/EnlargedView/` and `src/tabs/tic-tac-toe/` matching the tree in `specs/004-tic-tac-toe/plan.md`
- [X] T003 Record the map's **pre-migration** return-control geometry in `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx`. Add a test "keeps the collapse control geometry (004 E5)" that opens the Restaurants tab, waits 400ms for ContentRegion's entry animation to settle, clicks `STRINGS.expandLabel.en`, reads `getBoundingClientRect()` of the `STRINGS.collapseLabel.en` button, and asserts `top`, `right`, `width` and `height` against **literal numbers you measure now on the unmodified code** (±1px). Run it green before T008 changes anything (contract `enlarged-view.md` E5)

**Checkpoint**: Baseline green; the map's collapse-control rect is pinned by a passing test.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: (A) the shared `EnlargedView`, the shell's lift rule, and the restaurant map migrated onto it, which fixes the footer defect from research R2; (B) the Tic-Tac-Toe tab registered and rendering. Every user story renders its game inside `EnlargedView`, from the sixth tab.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### 2A: Shared enlarged view (tests first)

- [X] T004 [P] Write `src/components/EnlargedView/EnlargedView.test.tsx` covering every unit row of `specs/004-tic-tac-toe/contracts/enlarged-view.md` §5. It must cover: `data-enlarged-view` and `data-attract-exempt` for active×exempt combinations, and neither attribute while inactive (E2); exactly one `button[type=button]` named by `returnLabel`, present only while active (E4); focus on the return control when mounted active **and** when `active` flips from false to true (E7); `onReturn` called once per click; no `role="dialog"` and no `aria-modal` (E1); no Fullscreen API call, using a spy on a stubbed `Element.prototype.requestFullscreen` (E1a); **a child `<div data-testid="child">` is the identical DOM node (`toBe`) before and after toggling `active` false→true→false (E10)**; and after 20 mount/unmount cycles under `vi.useFakeTimers()`, `vi.getTimerCount()` is 0 with `document.addEventListener`/`removeEventListener` spy counts balanced (E9). Confirm it fails because the component does not exist
- [X] T005 [P] Add two failing tests to `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx`. (1) "covers the footer while expanded (004 R2)": expand the map, wait 200ms, and for the centre points of the `footer` element, the `[role="tablist"]` and the header, assert that `document.elementFromPoint(x, y)` is contained by `document.querySelector('[data-display="expanded"]')`. Confirm the **footer** assertion fails on the current code, which proves the defect. (2) "still dims while expanded in attract mode (004 R1)": render `<KioskProvider attractAfterSeconds={1}>`, open the tab, expand, wait 3200ms, and assert `getComputedStyle(document.querySelector('main')).opacity === '0.16'`
- [X] T006 [P] Add a failing test to `src/tabs/restaurant-map/RestaurantMap.test.tsx`, "does not remount the map frame across expand and collapse (004 E10)". Capture the element found by `screen.getByTitle(STRINGS.mapFrameTitle.en)`, expand, and assert the same query returns the identical node (`toBe`); collapse and assert it again. Also assert `document.querySelector('[data-enlarged-view]')` is null by default and non-null while expanded, and `[data-attract-exempt]` is never present. The identity assertions pass today, so they guard the migration. The attribute assertions fail until T010

### 2A: Shared enlarged view (implementation)

- [X] T007 [P] Create `src/components/EnlargedView/EnlargedView.module.css`. Move the panel rules verbatim from `.root.expanded` in `src/tabs/restaurant-map/RestaurantMap.module.css`: `position: fixed; inset: 0; z-index: 20; padding: var(--space-6); background: var(--color-surface)`. Add `.inactive { display: contents; }`. Copy the `.stateToggle`, `.toggleIcon` and `.toggleLabel` rules as `.returnControl`, `.returnIcon` and `.returnLabel`, keeping `--accent-color` inherited (E6), and position `.returnControl` relative to the panel so its rect matches T003's recorded values. Move the "KNOWN TRANSIENT" comment about ContentRegion's `transform` along with the panel rule
- [X] T008 Create `src/components/EnlargedView/EnlargedView.tsx` implementing the `EnlargedViewProps` API in `specs/004-tic-tac-toe/contracts/enlarged-view.md` §1 and rules E1–E10. Render **one wrapper `<div>` in both states**, with `className` `.panel` plus the caller's `className` while active and `.inactive` otherwise; the `data-enlarged-view` and `data-attract-exempt` attributes only as E2 allows; children; then, only while active, the `<button type="button">` with `Minimize2` (`aria-hidden`) and a `<span>` of `returnLabel`. Move focus to the button in an effect keyed on `active`. Explicit `| undefined` on optional props (`exactOptionalPropertyTypes`). No portal, no timers, no document listeners. Make T004 pass (depends on T007)
- [X] T009 Add the lift rule to `src/app/App.module.css`, exactly as the first rule in `specs/004-tic-tac-toe/contracts/enlarged-view.md` §3: `.shell:has([data-enlarged-view]) .content { z-index: 2; }`. Add a comment citing research R2 (the footer row follows `<main>` at the same z-index). **Do not add the attract exemption rule here**, because it lands with its test in T028
- [X] T010 Migrate `src/tabs/restaurant-map/RestaurantMap.tsx` onto `EnlargedView`. Wrap `mapArea`'s contents in `<EnlargedView active={isExpanded} returnLabel={s.collapseLabel} onReturn={collapse}>` **in both display states**, so the iframe never changes parent (E10). Pass no `attractExempt`. Render the expand `<button>` only when not expanded. Delete `collapseRef` and the `'collapse'` branch of `pendingFocus`, because EnlargedView E7 now focuses the return control. Keep the `'expand'` focus restore. Keep `data-display` and `data-map-status` on the root. Update the header comment to reference `specs/004-tic-tac-toe/contracts/enlarged-view.md` (depends on T008)
- [X] T011 Update `src/tabs/restaurant-map/RestaurantMap.module.css`: delete the `.root.expanded` panel positioning moved in T007, keep any expanded-state **inner** layout the map still needs (single column, list hidden), and keep `.stateToggle` for the expand control only (depends on T010)
- [X] T012 Run `npx vitest run --project unit src/components/EnlargedView src/tabs/restaurant-map` and `npx vitest run --project layout src/tabs/restaurant-map`. T003, T004, T005 and T006 plus **every pre-existing map test** must pass. If a pre-existing map test fails, fix the migration; only adjust the test if it depended on expand and collapse being the same element, and say so in the change (depends on T009–T011)
- [X] T013 [P] Update `specs/003-restaurant-map/contracts/view-states.md` §1 to state that the expanded state is implemented by the shared `EnlargedView` (`specs/004-tic-tac-toe/contracts/enlarged-view.md`), which now owns rules S2, S3, S6 and S7, and to record the fixed footer-overlap defect (004 research R2)

**Checkpoint 2A**: `EnlargedView` exists, the map uses it, the footer defect is fixed and pinned by a test, and every map test passes. **This slice is self-contained: it is suitable as its own commit, to be cherry-picked onto `feature/mappage`** (plan.md sequencing note).

### 2B: Tic-Tac-Toe tab skeleton

- [X] T014 [P] Create `src/tabs/tic-tac-toe/meta.ts`: `id: 'tic-tac-toe'`, `label: { en: 'Tic-Tac-Toe', hu: 'Amőba 3×3' }`, `icon: Grid3x3` from `lucide-react`, `accent: 'blue'`, `as const satisfies TabMeta`. Add a doc comment explaining the blue accent is used for UI graphics only (3.27:1) and that the Hungarian label is pending native-speaker review (research R9)
- [X] T015 [P] Create `src/tabs/tic-tac-toe/strings.ts` with every key in `specs/004-tic-tac-toe/contracts/view-states.md` §6 as `LocalizedText`, typed by a `TicTacToeStrings` interface, following the pattern in `src/tabs/restaurant-map/strings.ts`. Export `getGameStrings(locale)` returning the plain strings plus formatter functions: `turn(mark)`, `wins(mark)`, and `cellName(index, contents, isWinning)`, which composes row, column, contents and the optional winning suffix using 1-based row and column from `index`. Replace `{mark}` and `{n}` placeholders. Doc comment: Hungarian pending review
- [X] T016 Create `src/tabs/tic-tac-toe/TicTacToe.tsx` (default export) rendering only the `default` view for now: root `<div>` with `style={accentVars(meta.accent)}`, an `h2` with `s.heading`, a `<p>` with `s.intro`, a decorative `Grid3x3` (`aria-hidden="true"`), and a `<button type="button">` labelled `s.play` with no handler yet. Create `src/tabs/tic-tac-toe/index.tsx` exporting the default component and re-exporting `meta`, matching `src/tabs/restaurant-map/index.tsx` (depends on T014, T015)
- [X] T017 [P] Create `src/tabs/tic-tac-toe/TicTacToe.module.css` with the `default` view layout: heading, intro and illustration centred in the content region; Play with `min-height: var(--touch-target-min)`, generous padding and display font; every flexible box `min-height: 0; min-width: 0` (Principle II). Import it in `TicTacToe.tsx`
- [X] T018 Register the tab in `src/tabs/registry.ts`: import `TicTacToe, { meta as ticTacToeMeta }` from `./tic-tac-toe` and append `{ meta: ticTacToeMeta, Component: TicTacToe }` **after** the restaurant-map entry (FR-028) (depends on T016)
- [X] T019 [P] Update `src/tabs/registry.test.tsx`: rename to "registers exactly six tabs in the FR-011 order" and append `'tic-tac-toe'` to the expected id list. The existing per-tab heading test must pass for the new tab
- [X] T020 [P] Update `src/components/TabNav/TabNav.test.tsx`: the `{End}` and wrap-backwards `{ArrowLeft}` expectations become `/Tic-Tac-Toe/`
- [X] T021 [P] Update `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx`: rename "renders five nav tabs without overflow (research R7)" to six tabs, and change `toHaveLength(5)` to `toHaveLength(6)`
- [X] T022 Run `npm run typecheck`, `npm run test:unit` and `npm run test:layout` (scripts in `package.json`); all pass (depends on T018–T021)

**Checkpoint 2B**: Six tabs. The Tic-Tac-Toe tab shows its heading, intro and an inert Play button. The whole suite is green.

---

## Phase 3: User Story 1 - Two visitors play a game of Tic-Tac-Toe to the end (Priority: P1) 🎯 MVP

**Goal**: Play opens the full-viewport game, and two players alternate X and O. The turn is always shown, and wins and draws are detected, announced and highlighted. The view does not dim while players think.

**Independent Test**: Open Tic-Tac-Toe, tap Play, and play X across the top row. Turns alternate, occupied squares ignore taps, "X wins!" appears with the top row ringed, and nothing more can be placed. Repeat for an O win and a draw. With `attractAfterSeconds={1}`, the board stays at full opacity (spec US1; quickstart §2.1, §2.2 step 1).

### Tests for User Story 1

- [X] T023 [P] [US1] Write `src/tabs/tic-tac-toe/game.test.ts` covering `specs/004-tic-tac-toe/contracts/game-rules.md` §5, **except the `newGame` row**, which is T037. Include: the exhaustive depth-first walk from `EMPTY_BOARD`, applying `gameReducer(board, { type: 'place', index })` at every empty index of every non-terminal board and deduplicating by `board.join(',')`, asserting **exactly 5,478** positions; an independent oracle built from 9-bit masks that **must not import `WIN_LINES`**, compared to `evaluate` for every position including `winningCells`; invariants I1–I4 on every position; the no-op rule G7 (same reference) for occupied indices, every index of terminal positions, and `-1`, `9` and `1.5`; and named readable cases: top-row X win, O column win, both diagonals, a draw, a win on the ninth move, and a double-line win with 5 `winningCells` (e.g. X1 O4 X2 O5 X3 O7 X6 O8 X0)
- [X] T024 [P] [US1] Write `src/tabs/tic-tac-toe/GameBoard.test.tsx` for the US1 rows of `specs/004-tic-tac-toe/contracts/view-states.md` §7. Render `<KioskProvider><GameBoard /></KioskProvider>` and cover: status "X's turn" initially, then alternating turns on cell `pointerdown`; tapping an occupied cell changes nothing; X win, O win and draw status texts; winning cells' accessible names end with "winning line"; after the game ends every cell has `aria-disabled="true"` and **none has the `disabled` attribute** (A3); a focused cell keeps focus when its move ends the game; the `role="status"` element is the identical node across moves (A4); board `role="group"` named "Game board" (A1); **N2** a second `pointerdown` with a different `pointerId` while the first is down does not commit; **N3** after `pointercancel`, and separately after `lostpointercapture`, a new `pointerdown` commits; **N4** `fireEvent.click(cell, { detail: 1 })` does not commit and `fireEvent.click(cell, { detail: 0 })` does. Stub `HTMLElement.prototype.setPointerCapture` and `releasePointerCapture` if jsdom lacks them, and use `fireEvent.pointerDown(cell, { pointerId, pointerType: 'touch', button: 0 })`
- [X] T025 [P] [US1] Write the US1 part of `src/tabs/tic-tac-toe/TicTacToe.test.tsx`. Cover: the `default` view renders on mount with heading and Play (V1); clicking Play shows nine cells all named "…, empty", status "X's turn", and focus on the "Close game" button (E7); **SC-001**: for each of the other five tab labels, render `<KioskProvider><App /></KioskProvider>`, click that tab, click "Tic-Tac-Toe", click "Play", and assert an empty board with X to move; `[data-attract-exempt]` is absent in `default` and present in `enlarged` (V6); clicking "Close game" returns to `default`; and `document.fullscreenElement` stays null (E1a)
- [X] T026 [P] [US1] Write `src/tabs/tic-tac-toe/TicTacToe.browser.test.tsx` (layout project) through `<KioskProvider><App /></KioskProvider>`, reusing the `expectNoOverflow`, `MIN_TOUCH_TARGET = 64` and `MIN_TOUCH_GAP = 16` helpers pattern from `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx`. Cover, **in both `en` and `hu`** (toggle locale with the header's language button): no overflow in `default`, `enlarged` empty, mid-game, X wins and draw; every cell, Play and the return control ≥64×64, with ≥16px between horizontally adjacent cells; all six `role="tab"` labels have `scrollWidth <= clientWidth` (R7). Independent of locale: while enlarged, `elementFromPoint` at the footer centre is inside `[data-enlarged-view]`; with `attractAfterSeconds={1}` and 3200ms waited, `<main>` opacity is `'1'` while enlarged and `'0.16'` on the `default` view (SC-011, R1); a real keyboard Enter from `@vitest/browser/context` `userEvent` on a focused empty cell places a mark (N4); the game's "Close game" rect equals the map's collapse-control rect, opening each in turn (E5, FR-004)

### Implementation for User Story 1

- [X] T027 [P] [US1] Create `src/tabs/tic-tac-toe/game.ts` implementing `specs/004-tic-tac-toe/contracts/game-rules.md` §1–§3 for the `place` action: types `Mark`, `Cell`, `Board` (readonly 9-tuple), the `GameStatus` union and the `GameAction` union (declare `newGame` in the type now; the reducer may return the board unchanged for it until T037); `WIN_LINES`; a frozen `EMPTY_BOARD`; `cellPosition(index)`; `evaluate(board)` with line checks **before** the full-board check (G1–G4) and `winningCells` as the sorted union (G2); `gameReducer` returning the **same reference** for every illegal `place` (G6, G7). No React imports. Make T023 pass
- [X] T028 [P] [US1] Add the attract exemption rule to `src/app/App.module.css`, exactly as the second rule in `specs/004-tic-tac-toe/contracts/enlarged-view.md` §3: `.shell:has([data-enlarged-view][data-attract-exempt]) .content { opacity: 1; }`, with **no `!important`** (H1) and a comment citing research R1 (attract dims `<main>` itself; a descendant cannot undo it)
- [X] T029 [US1] Create `src/tabs/tic-tac-toe/useBoardInput.ts` implementing `specs/004-tic-tac-toe/contracts/view-states.md` §3 N1–N6. Signature: `useBoardInput(dispatchPlace: (index: number) => void)` returns `{ boardProps, cellProps(index) }`. Use **one board-level `onPointerDown`** and no cell-level pointer handler. React runs a cell's handler before the board's, so a cell handler would read the set before the board had recorded the current pointer, and N2 would never trigger. The handler must: note `wasEmpty = activePointers.size === 0`; add `event.pointerId`; call `event.currentTarget.setPointerCapture(event.pointerId)` (N3); and commit only when `wasEmpty`, the pointer is touch or pen or a mouse with `button === 0` (N1), and `(event.target as Element).closest('[data-cell-index]')` resolves, dispatching that `data-cell-index`. `boardProps` also carries `onPointerUp`, `onPointerCancel` and `onLostPointerCapture`, each deleting the id. `cellProps(index)` returns `{ 'data-cell-index': index, onClick }`, where `onClick` commits only when `event.detail === 0` (N4). Keep `activePointers` in `useRef(new Set<number>())`. Never call `preventDefault` or `stopPropagation` (N6). Add a doc comment explaining the handler order, N2's board scope and N3's stale-id hazard (depends on T027)
- [X] T030 [US1] Create `src/tabs/tic-tac-toe/GameBoard.tsx`: `useReducer(gameReducer, EMPTY_BOARD)`, with `status = evaluate(board)` computed during render. Render a `role="group"` board named `s.boardName` with `boardProps`. Render nine `<button type="button">` cells in index order with `cellProps(i)`, `aria-label={s.cellName(i, board[i], isWinning)}` and `aria-disabled` when occupied or the game is over (never `disabled`). Marks are lucide `X` or `Circle` with `aria-hidden`. Render **one persistent** `<p role="status">` whose text is `s.turn(status.turn)`, `s.wins(status.winner)` or `s.draw`, with the matching mark icon beside it (A6). Mark winning cells with a class and `data-winning`. Make T024 pass (depends on T027, T029)
- [X] T031 [US1] Wire the game view in `src/tabs/tic-tac-toe/TicTacToe.tsx`: `useState<'default' | 'enlarged'>('default')`. Play sets `enlarged`. While `enlarged`, render `<EnlargedView active attractExempt returnLabel={s.close} onReturn={() => setDisplay('default')} className={styles.game}><GameBoard /></EnlargedView>` instead of the default content. Add a header doc comment covering: no reset logic, because unmounting discards the game (research R6); `EnlargedView` mounting per Play is intentional (contract §4); and the attract exemption (FR-020). Make T025 pass (depends on T008, T030)
- [X] T032 [US1] Add the game-view styles to `src/tabs/tic-tac-toe/TicTacToe.module.css` per `specs/004-tic-tac-toe/contracts/view-states.md` §2 and §5. `.game` is a two-column grid: the board square sized to the panel's content height with `aspect-ratio: 1`, and a vertically centred side panel that keeps clear of the return control (L1, L2). The board is a 3×3 grid with `gap: var(--touch-gap-min)`, `touch-action: manipulation` and `user-select: none` (N7). Cells use `--color-surface` with a `--color-border` outline. X marks use `--brand-blue-ink`, O marks `--brand-orange-ink`, and marks size to about 60% of the cell. Winning cells get a 6px inset `--color-text` ring plus `--brand-orange-soft` fill. Status uses the display font at `--text-4xl` in `--color-text`. Every flexible box gets `min-width: 0; min-height: 0`, and status text may wrap (L3)
- [X] T033 [US1] Run `npx vitest run --project unit src/tabs/tic-tac-toe` and `npx vitest run --project layout src/tabs/tic-tac-toe src/tabs/restaurant-map`. T023–T026 pass and the map's T005 dimming test still passes, so the exemption does not leak to the map (depends on T027–T032)

**Checkpoint US1**: A complete game can be played to a correct, announced result from the sixth tab. The board stays bright during attract. Close returns to the intro. **This is the MVP.**

---

## Phase 4: User Story 2 - Players start over without leaving the game (Priority: P2)

**Goal**: A New game control, always visible in the game view, clears the board to X-to-move instantly, mid-game or after a result, with no confirmation.

**Independent Test**: Play three moves, tap New game, and the board is empty with X to move. Finish a game, tap New game, and the result and ring are gone with X to move (spec US2).

### Tests for User Story 2

- [X] T034 [P] [US2] Add the `newGame` row of `specs/004-tic-tac-toe/contracts/game-rules.md` §5 to `src/tabs/tic-tac-toe/game.test.ts`: from a mid-game position, a won position and a draw, `gameReducer(board, { type: 'newGame' })` returns `EMPTY_BOARD` **by reference**; from `EMPTY_BOARD` it returns the same reference (G8)
- [X] T035 [P] [US2] Add New game tests to `src/tabs/tic-tac-toe/GameBoard.test.tsx`: a `button` named "New game" exists at every point, including initially, mid-game and after X wins and a draw; activating it mid-game clears all nine cells to "…, empty" with status "X's turn"; after a win it also removes every `data-winning` cell and clears `aria-disabled` on all cells; no confirmation step appears and there is no `role="dialog"`; the `role="status"` element is still the identical node afterwards (A4)
- [X] T036 [P] [US2] Add to `src/tabs/tic-tac-toe/TicTacToe.browser.test.tsx`, in both locales: the New game button is ≥64×64, at least 16px from the nearest cell and from the return control, and fully inside the viewport in `enlarged` empty, mid-game, X wins and draw states (L4, FR-016)

### Implementation for User Story 2

- [X] T037 [US2] Implement the `newGame` action in `gameReducer` in `src/tabs/tic-tac-toe/game.ts`: return `EMPTY_BOARD`, which is already the same reference when the board is `EMPTY_BOARD` (G8). Make T034 pass
- [X] T038 [US2] Add the New game control to `src/tabs/tic-tac-toe/GameBoard.tsx`: a `<button type="button">` in the side panel below the status, with a `RotateCcw` icon (`aria-hidden`) and the visible label `s.newGame`, dispatching `{ type: 'newGame' }`. It is rendered in every status (FR-016). Make T035 pass (depends on T037)
- [X] T039 [US2] Style the New game control in `src/tabs/tic-tac-toe/TicTacToe.module.css`: `min-height: var(--touch-target-min)`, padding and display font consistent with Play, and `margin-top` ≥ `var(--touch-gap-min)` from the status (L4). Run `npx vitest run --project unit src/tabs/tic-tac-toe` and `npx vitest run --project layout src/tabs/tic-tac-toe`; T034–T036 pass (depends on T038)

**Checkpoint US2**: Rematches take one tap, and US1 behaviour is unchanged.

---

## Phase 5: User Story 3 - The game gets out of the way and the kiosk recovers on its own (Priority: P3)

**Goal**: Close returns focus to Play and discards the game. Walking away lets the 60s idle reset exit the game and discard it. Active play is never reset out from under the players.

**Independent Test**: Start a game, place marks, and stop touching. After the idle period the kiosk is on Board Agenda, and Tic-Tac-Toe → Play shows an empty board with X to move. Close mid-game and reopen: empty board, and focus was on Play after closing (spec US3).

### Tests for User Story 3

- [X] T040 [P] [US3] Add US3 tests to `src/tabs/tic-tac-toe/TicTacToe.test.tsx`: after "Close game", the Play button `toHaveFocus()` (V5, FR-007); close mid-game then Play again gives nine empty cells and "X's turn" (V2, V3, FR-017); **use `fireEvent`, not `userEvent`, under fake timers in this file.** **Idle reset** under `vi.useFakeTimers()` with `<KioskProvider idleTimeoutSeconds={5}>` and `<App />`: open the tab, Play, place two marks, advance 6000ms, and the Board Agenda tab is `aria-selected` with no `[data-enlarged-view]`; then click Tic-Tac-Toe and Play and the board is empty (FR-018, SC-007); **active play is not reset** with the same provider: place a mark every 4000ms for five moves, advancing timers between them, and the game view is still open with five marks (FR-019); after 20 Play/Close cycles, `vi.getTimerCount()` is 0 (Principle V)
- [X] T041 [P] [US3] Add to `src/tabs/tic-tac-toe/TicTacToe.browser.test.tsx`: with `<KioskProvider idleTimeoutSeconds={3} attractAfterSeconds={1}>`, open the game, place a mark, and wait 3500ms. `[data-enlarged-view]` is gone, `<main>` opacity returns toward `0.16` (the exemption ended with the view), and the Board Agenda tab is selected (FR-018, FR-020 "attract works as usual once the game view is left or reset")

### Implementation for User Story 3

- [X] T042 [US3] Restore focus to Play on close in `src/tabs/tic-tac-toe/TicTacToe.tsx`. Add `playRef` and a `pendingFocus` ref set to `'play'` in the return handler, then focus `playRef.current` in an effect keyed on `display` once the `default` render has committed, mirroring the `pendingFocus` pattern in `src/tabs/restaurant-map/RestaurantMap.tsx` (V5). **Add no reset or idle code**: T040's discard and idle tests must pass from unmounting alone (research R6). If one fails, find why state survived an unmount rather than adding reset logic
- [X] T043 [US3] Run `npx vitest run --project unit src/tabs/tic-tac-toe` and `npx vitest run --project layout src/tabs/tic-tac-toe`; T040 and T041 pass (depends on T042)

**Checkpoint US3**: All three stories work independently. The game can't strand the kiosk.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence for the constitution's quality gates, the soak script, device validation and removability.

- [X] T044 [P] Create `src/tabs/tic-tac-toe/TicTacToe.soak.browser.test.tsx`, the SC-008 scripted run that `specs/004-tic-tac-toe/quickstart.md` §2.7 refers to. Wrap it in `describe.skipIf(!import.meta.env.VITE_SOAK)` so the default suite skips it. It renders `<KioskProvider idleTimeoutSeconds={100000} attractAfterSeconds={100000}><App /></KioskProvider>`, opens the game, and plays **500** games by clicking cells in a fixed winning sequence then New game. Every 100 games it records `document.getElementsByTagName('*').length` and, where available, `(performance as any).memory?.usedJSHeapSize`. It asserts the DOM node count after game 500 equals the count after game 1, and logs the heap samples. Update §2.7 of `specs/004-tic-tac-toe/quickstart.md` with the run command `VITE_SOAK=1 npx vitest run --project layout src/tabs/tic-tac-toe/TicTacToe.soak.browser.test.tsx`, and state that the 72-hour idle part stays manual on the device
- [X] T045 [P] Add computed-colour guards to `src/tabs/tic-tac-toe/TicTacToe.browser.test.tsx`. On a board with an X, an O and a winning line: the X icon's computed `color` equals `rgb(0, 104, 143)`, the O icon's equals `rgb(168, 84, 0)`, the status text equals `rgb(1, 28, 49)`, and a winning cell has a non-`none` `box-shadow` or `outline` (the non-colour cue). This pins view-states.md §5 so a token change cannot silently break contrast
- [X] T046 Run the constitution grep checks from `specs/004-tic-tac-toe/quickstart.md` §3. Over `src/tabs/tic-tac-toe/` and `src/components/EnlargedView/`: no `createPortal`, `<dialog`, `role="dialog"`, `aria-modal` or `requestFullscreen` (IV, FR-006). Over `src/tabs/tic-tac-toe/`: no `fetch`, `XMLHttpRequest`, dynamic `import(` or `http` (VIII, FR-026). Over `src/tabs/tic-tac-toe/` excluding tests: no `setTimeout`, `setInterval` or `addEventListener` (V). Record the results for the PR description
- [X] T047 Removability check (Principle IX, FR-027): in a scratch working copy, or on a throwaway commit you then revert, delete `src/tabs/tic-tac-toe/` and its import and entry in `src/tabs/registry.ts`, and revert `src/tabs/registry.test.tsx`, `src/components/TabNav/TabNav.test.tsx` and the nav-count test in `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx` to five tabs. `npm run typecheck`, `npm run test:unit` and `npm run test:layout` then pass, and the map still enlarges and covers the footer. Restore everything afterwards and confirm `git status` shows no leftover changes from this check
- [X] T048 Full verification using the scripts in `package.json`: `npm run typecheck`, `npm run test:unit`, `npm run test:layout` and `npm run build` all pass. Compare the test counts with T001's baseline, and every pre-existing test still runs and passes
- [ ] T049 🖐 On the device, run `specs/004-tic-tac-toe/quickstart.md` §2.1–§2.4: full games including the double-line case, pause without dimming, walk-away reset, and **real multi-touch (§2.3, all three steps; step 3 checks pointer capture)**. Also confirm the map does not reload on expand, collapse and expand again (§2.4 step 4)
- [ ] T050 [P] 🖐 Run `specs/004-tic-tac-toe/quickstart.md` §2.5 and §2.6: Hungarian strings on the device, and a **native speaker signs off** the copy in `src/tabs/tic-tac-toe/strings.ts` and the nav label in `src/tabs/tic-tac-toe/meta.ts`. If wording changes, re-run `npm run test:layout`. Then the Narrator run, including activating a cell by Narrator itself
- [ ] T051 [P] 🖐 Run `specs/004-tic-tac-toe/quickstart.md` §2.9 (offline), §2.7 (T044's scripted run, then 72 hours idle on the device) and §2.8 (hallway test with 10 pairs). Record SC-008 and SC-009 outcomes in the PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T003 **must** finish before T007/T010 touch the map, because it records the geometry the migration has to preserve.
- **Foundational (Phase 2)**: Depends on Setup. 2A (T004–T013) and 2B (T014–T022) can progress side by side, except that T021 edits the same map layout test file as T005, so run them in sequence. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Phase 2. Needs `EnlargedView` (T008) and the registered tab (T018).
- **User Story 2 (Phase 4)**: Depends on US1's `game.ts`, `GameBoard.tsx` and the game view. See the caveat below.
- **User Story 3 (Phase 5)**: Depends on US1's game view. It does **not** depend on US2.
- **Polish (Phase 6)**: Depends on the stories being shipped.

### User Story Dependencies

- **US1 (P1)**: Only Foundational. It is the MVP.
- **US2 (P2)**: Builds on US1. It extends `game.ts` and `GameBoard.tsx`, which US1 creates.
- **US3 (P3)**: Builds on US1. It extends `TicTacToe.tsx`. It can be done before or in parallel with US2.

### ⚠️ Caveat on cross-story parallelism

The stories are **independently testable** but not independently **buildable**. US2 and US3 have
nothing to act on until US1 has created the board and game view. That is inherent to the feature:
restarting or leaving a game needs a game. Once US1 is merged, US2 and US3 touch different files
(US2: `game.ts`, `GameBoard.tsx`, New game CSS; US3: `TicTacToe.tsx`), **except** that both add
tests to `TicTacToe.browser.test.tsx`. T036 and T041 must not be edited at the same time.

### Within Each Phase

- Tests first, and confirm they fail (T004–T006 before T007–T011; T023–T026 before T027–T032; and so on).
- `game.ts` → `useBoardInput.ts` → `GameBoard.tsx` → `TicTacToe.tsx` → CSS.
- Each phase ends with a run task (T012, T022, T033, T039, T043) that must be green before the next phase starts.

---

## Parallel Example: Phase 2A

```bash
# Tests first, in three different files:
Task: "T004 EnlargedView unit tests in src/components/EnlargedView/EnlargedView.test.tsx"
Task: "T005 footer paint + non-exempt dimming tests in src/tabs/restaurant-map/RestaurantMap.browser.test.tsx"
Task: "T006 iframe identity test in src/tabs/restaurant-map/RestaurantMap.test.tsx"

# Then, alongside the CSS:
Task: "T007 EnlargedView.module.css"
Task: "T014 meta.ts"   # 2B can start while 2A is implemented
Task: "T015 strings.ts"
```

## Parallel Example: User Story 1

```bash
# All four test files at once:
Task: "T023 exhaustive rules test in src/tabs/tic-tac-toe/game.test.ts"
Task: "T024 board behaviour + input rules in src/tabs/tic-tac-toe/GameBoard.test.tsx"
Task: "T025 open/close, SC-001, exemption attribute in src/tabs/tic-tac-toe/TicTacToe.test.tsx"
Task: "T026 layout, attract opacity, keyboard in src/tabs/tic-tac-toe/TicTacToe.browser.test.tsx"

# Then the rules and the shell rule, which are independent:
Task: "T027 game.ts"
Task: "T028 exemption rule in src/app/App.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup, including T003's pre-migration measurement.
2. Phase 2: Foundational. **Stop after Checkpoint 2A** and review the map migration on its own. It is the riskiest change, and it is useful even if the game never ships.
3. Phase 3: US1.
4. **Stop and validate**: quickstart §2.1 steps 1–3 and §2.2 step 1 on the device.

### Incremental Delivery

1. Setup + Foundational 2A → shared `EnlargedView` + map footer fix (cherry-pick candidate for `feature/mappage`).
2. Foundational 2B → sixth tab visible with an inert Play.
3. US1 → playable game (MVP).
4. US2 → New game.
5. US3 → focus restore, plus verified discard and idle behaviour.
6. Polish → soak, grep checks, removability, device validation.

---

## Phase 7: Post-implementation corrections

**Purpose**: Fixes reported after `/speckit-implement` completed Phases 1–6, found by manual review
of the running feature rather than by a task in the original breakdown. Each one updates the
contract it corrects so the artifacts do not drift from the code — see
[contracts/view-states.md](contracts/view-states.md) §2 (L1, A6) and
[research.md](research.md) R10 for the corrected text and why.

- [X] T052 Centre the board and side panel as one unit in the game view, replacing the
  `grid-template-columns: auto 1fr` layout (which pinned the board to the left edge and stretched
  the side panel across the remaining width) with a `flex` row and `justify-content: center` in
  `src/tabs/tic-tac-toe/TicTacToe.module.css`. Verified in real Chromium: the board's right edge
  sits 241px clear of the return control, no overlap. Updates `contracts/view-states.md` §2 (L1) —
  reported by the user after using the built feature
- [X] T053 Remove the mark icon from the status line in `src/tabs/tic-tac-toe/GameBoard.tsx`: it
  rendered beside text that already spelled the mark out (e.g. a ✕ glyph next to "X's turn"),
  reading as a redundant duplicate rather than added information. Text alone still satisfies
  FR-011 (the mark named in text, not colour alone), so this is a contract correction, not a
  requirement change. Removed the now-unused `.statusIcon` rule from `TicTacToe.module.css`.
  Updates `contracts/view-states.md` §4 (A6) and `research.md` R10 — reported by the user after
  using the built feature
- [X] T054 Re-run `npm run typecheck`, `npm run test:unit` and `npm run test:layout`; all pass
  (189 unit, 37 passed + 1 skipped layout) with no test changes needed — neither fix was covered
  by an assertion specific enough to break (touch-target and no-overlap checks are geometry-
  tolerant; no test asserted the icon's presence)

**Checkpoint**: Both corrections verified in real Chromium and folded back into the contract that
was wrong, so a later reader of `contracts/view-states.md` sees the current design, not the
original pass.

---

## Notes

- **No reset logic anywhere.** If a discard or idle test fails, the fix is never a `useEffect` that clears the board. Find what survived the unmount (research R6).
- **No context changes.** `KioskContext` and `useIdleReset` are not modified by this feature (plan.md Structure Decision). A task that seems to need them is a design deviation: stop and raise it.
- **Don't simplify the input rules.** N2 (board-scoped set), N3 (pointer capture) and N4 (`detail === 0`) each prevent a specific silent failure. Their reasons are recorded in `contracts/view-states.md` §3.
- Hungarian copy is provisional until T050. Layout tests protect the fit whatever the final wording.
- Commit at each checkpoint, only when asked. Checkpoint 2A is the natural first commit.
