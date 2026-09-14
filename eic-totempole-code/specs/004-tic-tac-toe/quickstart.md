# Quickstart: Validating Fullscreen Tic-Tac-Toe

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to prove the feature works end to end. Automated checks come first. The manual checks marked 🖐
cover what neither test project can simulate faithfully: real multi-touch, Narrator, the device's
own browser, and multi-day uptime.

For what each rule means, follow the links into [contracts/](contracts/). They are not repeated here.

---

## Prerequisites

- Node and dependencies installed (`npm install`), with Playwright's Chromium available for the
  `layout` project.
- On branch `feature/tic-tac-toe`.
- For §2: the Surface Hub 2S, or a 1920x1280 touch display running Edge, with the build served
  statically.

## 1. Automated checks

```bash
npm run typecheck
npm run test:unit      # rules (exhaustive), reducer, components, focus, announcements
npm run test:layout    # real Chromium 1920x1280: no-scroll, targets, nav, paint order, attract
npm run build          # static dist/ output
```

### Expected results

| Check | Must show | Covers |
|-------|-----------|--------|
| `game.test.ts` | "reaches exactly 5,478 positions" passes, and oracle agreement holds for all | SC-002, [game-rules](contracts/game-rules.md) §5 |
| `GameBoard.test.tsx` | Multi-touch, `pointercancel` and `detail` cases pass | FR-010, FR-022, [view-states](contracts/view-states.md) N2–N4 |
| `TicTacToe.test.tsx` | Idle reset discards the game; no timers remain after cycles | FR-018, SC-007, Principle V |
| `EnlargedView.test.tsx` | Children are the identical DOM node across `active` toggles | [enlarged-view](contracts/enlarged-view.md) E10 |
| `RestaurantMap.test.tsx` / `.browser.test.tsx` | All pre-existing tests pass, **plus** iframe identity across expand/collapse, footer paint check, non-exempt dimming and the unchanged return-control rect | Map migration did not regress 003; FR-003 defect fixed |
| `TicTacToe.browser.test.tsx` | Zero overflow in every state and both locales; six untruncated tab labels; `<main>` opacity `1` while enlarged in attract | SC-005, SC-006, SC-011, FR-020, FR-029 |
| Whole suite | Every test from before this branch still passes | No regressions |

If the map's footer check fails, the shell's lift rule is missing or out of step with
`EnlargedView`'s attribute. See [enlarged-view](contracts/enlarged-view.md) §3 H3.

## 2. 🖐 Manual validation

Run on the device at 1920x1280 with `npm run preview` or the deployed static build.

### 2.1 🖐 A full game, both results (User Story 1)

1. Tap **Tic-Tac-Toe** in the nav. Expect the introduction and Play, with header, hero, nav and
   footer visible.
2. Tap **Play**. Expect the board to fill the screen, the footer countdown to be covered, and
   "X's turn".
3. Play X across the top row. Expect "X wins!", those three cells ringed, and further taps doing
   nothing.
4. **New game**. Play to a draw. Expect "It's a draw!" and no ringed cells.
5. **New game**. Play this exact order (cells numbered 0–8, row-major): X1, O4, X2, O5, X3, O7,
   X6, O8, X0. The ninth move completes a row and a column at once. Expect five ringed cells and a win, not a draw
   (FR-012, FR-013).

### 2.2 🖐 Pausing does not dim the board; walking away still resets (FR-018, FR-020, SC-011)

1. Mid-game, stop touching for **40 seconds**. Expect the board to stay at full brightness. Then
   tap an empty cell: the mark is placed.
2. Tap **Close game**, then wait 40 seconds on the Tic-Tac-Toe intro. Expect it to dim like every
   other destination.
3. Tap **Play**, place two marks, and walk away for **65 seconds**. Expect the kiosk to return to
   Board Agenda in attract mode. Tap Tic-Tac-Toe, then Play: the board is empty and it's X's turn.

### 2.3 🖐 Multi-touch on the real panel (FR-010): the check the tests cannot make

1. Rest one finger on an empty cell and keep it down. With a second finger, tap a different empty
   cell. Expect only the first cell to receive a mark, and the turn to pass once.
2. Rest a palm on the **side panel** (not the board) and tap an empty cell. Expect the mark to be
   placed: the multi-touch rule is scoped to the board ([view-states](contracts/view-states.md) N2).
3. Press a cell and slide the finger off the board before lifting. Then tap another empty cell.
   Expect the mark to be placed. A failure here means pointer capture is broken, and every later
   touch would be ignored (N3).

### 2.4 🖐 Leaving and the map still matching (FR-004, FR-005, FR-017)

1. Mid-game, tap **Close game**. Expect the intro. Tap Play: the board is empty.
2. Open **Restaurants** and expand the map. The return control must be in the same place, the same
   size and the same style as the game's. Only the icon colour differs.
3. With the map expanded, confirm the footer countdown is covered. Before this branch, it was not.
4. Pan and zoom the expanded map, tap its return control, then expand again. Expect the map not to
   reload: no loading text and no jump back to the initial framing ([enlarged-view](contracts/enlarged-view.md) E10).

### 2.5 🖐 Language (FR-021)

Switch to Hungarian on any tab, then open the game. Check the nav label, intro, Play, Close,
New game, turn, win and draw strings. Confirm nothing is truncated or wraps off-screen. **Ask a
native speaker to sign off the Hungarian copy**, the nav label `Amőba 3×3` above all
([view-states](contracts/view-states.md) §6).

### 2.6 🖐 Narrator and keyboard (FR-022, SC-010)

1. Enable Narrator. Open the game and confirm focus lands on "Close game".
2. Move through the cells. Each is announced as "Row n, column n, empty".
3. Activate a cell with Narrator's own activation, not a tap. Expect a mark to be placed and
   "O's turn" to be announced.
4. Finish a game. Expect the result to be announced, winning cells to include "winning line", and
   focus to stay on the last cell rather than jumping to the page.

### 2.7 🖐 Soak (SC-008)

The "500 consecutive games" half of this is automated:

```bash
VITE_SOAK=1 npx vitest run --project layout src/tabs/tic-tac-toe/TicTacToe.soak.browser.test.tsx
```

It plays 500 games via a fixed winning sequence, sampling the DOM node count and (where available)
`performance.memory.usedJSHeapSize` every 100 games, and asserts the node count after game 500
equals the count after game 100. Run at planning/implementation time: both stayed exactly flat
(191 nodes; 47.4MB heap) across all five checkpoints — see `tasks.md` T044.

The 72-hour idle half is **not** covered by that automated run and stays manual: leave the kiosk
untouched on the device for 72 hours after the 500 games, comparing the Edge task manager's memory
for the tab at start, after the games and at the end. Expect no upward trend, and responsiveness
unchanged when a game is played at the end.

### 2.8 🖐 Hallway test (SC-009)

Ten pairs who have not seen the kiosk. Without instructions, at least 9 start a game, finish it, and
start a second.

### 2.9 🖐 Offline (FR-026)

With the static build already loaded, disconnect the device from the network. Open Tic-Tac-Toe,
play a game to a result and start a new game. Everything must work, with no loading state and no
error. Reconnect afterwards.

## 3. Constitution spot-checks before merge

| Principle | Evidence to attach to the PR |
|-----------|------------------------------|
| II | `TicTacToe.browser.test.tsx` overflow results for every state in both locales |
| III | Touch-target assertions: cells, Play, New game, return and all six nav tabs |
| IV | Grep of the feature and `EnlargedView` for `createPortal`, `<dialog`, `role="dialog"`, `aria-modal`, `requestFullscreen`: none found (FR-006, E1a) |
| VIII | Grep of `src/tabs/tic-tac-toe/` for `fetch`, `XMLHttpRequest`, `import(`, `http`: none found (FR-026); §2.9 passed |
| V | Timer and listener balance tests; §2.3 step 3 passed on the device; §2.7 soak |
| VII | Contrast values from [view-states](contracts/view-states.md) §5; §2.6 Narrator run |
| IX | Delete `src/tabs/tic-tac-toe/` and its registry line locally: typecheck and all remaining tests pass, and the map still enlarges correctly |
