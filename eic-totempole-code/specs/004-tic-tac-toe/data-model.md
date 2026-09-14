# Phase 1 Data Model: Fullscreen Tic-Tac-Toe

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md) R4, R6

Everything here is transient, in memory, and owned by one mounted component. Nothing is persisted,
transmitted or shared with another feature (FR-025). There are no collections that grow: the board
is a fixed nine-tuple, and the only set holds at most one ID per finger on the board.

---

## 1. `Mark` and `Cell`

| Type | Values | Notes |
|------|--------|-------|
| `Mark` | `'X' \| 'O'` | Rendered as the same shape in both locales (FR-021). |
| `Cell` | `Mark \| null` | `null` = empty. Once a cell holds a mark it never changes within a game. |

## 2. `Board`: the only stored game state

A read-only tuple of exactly nine `Cell`s in **row-major order**.

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|-------|---|---|---|---|---|---|---|---|---|
| Row | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 |
| Column | 1 | 2 | 3 | 1 | 2 | 3 | 1 | 2 | 3 |

`row = floor(index / 3) + 1`, `column = index % 3 + 1`. These 1-based values appear in accessible
names (FR-022).

`EMPTY_BOARD` is one frozen shared constant. `newGame` returns it, so starting a new game on an
already empty board is a referential no-op.

### Validation rules (asserted in `game.test.ts` over all 5,478 reachable positions)

| ID | Rule |
|----|------|
| B1 | Length is exactly 9. |
| B2 | `count(X) − count(O)` ∈ {0, 1}, because X always moves first (FR-009). |
| B3 | At most one player holds a completed line. Both players holding one is unreachable. |
| B4 | If X holds a completed line, `count(X) = count(O) + 1`. If O does, `count(X) = count(O)`. The winner made the last move. |

## 3. `GameStatus`: derived, never stored

`evaluate(board): GameStatus`, a discriminated union:

| `kind` | Extra fields | Holds when |
|--------|--------------|------------|
| `'playing'` | `turn: Mark` | No completed line and at least one empty cell. `turn` = `'X'` if the X and O counts are equal, else `'O'`. |
| `'won'` | `winner: Mark`, `winningCells: readonly number[]` | Some player holds ≥1 of the 8 lines. `winningCells` is the **sorted union** of every completed line's indices. It has 3 entries for a single line, and 5 for a double line sharing one cell (FR-013). |
| `'draw'` | (none) | All nine cells are filled and no line is complete. |

Precedence: a completed line wins **before** the full-board check, so a ninth move that completes a
line is `'won'`, never `'draw'` (FR-012).

The eight lines are rows `[0,1,2] [3,4,5] [6,7,8]`, columns `[0,3,6] [1,4,7] [2,5,8]`, and diagonals
`[0,4,8] [2,4,6]`. See [contracts/game-rules.md](contracts/game-rules.md).

## 4. Game actions and transitions

`gameReducer(board, action): Board`

| Action | Precondition for a change | Result | Otherwise |
|--------|---------------------------|--------|-----------|
| `{ type: 'place', index }` | `evaluate(board).kind === 'playing'`, `0 ≤ index ≤ 8`, and `board[index] === null` | New board with `board[index] = turn` | **Same board reference** (FR-009, FR-015) |
| `{ type: 'newGame' }` | Board is not `EMPTY_BOARD` | `EMPTY_BOARD` | Same reference |

### State diagram

```text
                  place(empty cell)
                 ┌───────────────┐
                 ▼               │
  EMPTY ──► playing(turn) ───────┘
   ▲          │        │
   │          │ place completes a line
   │          ▼        │ place fills the last cell, no line
   │     won(winner)   ▼
   │          │      draw
   │          │        │
   └──────────┴────────┘
        newGame (from any state, including mid-game)

  place(occupied cell)  → no change
  place(any, when won or draw) → no change
```

## 5. View state of the tab (transient, per mount)

Owned by `TicTacToe.tsx`:

| Field | Values | Initial | Notes |
|-------|--------|---------|-------|
| `display` | `'default' \| 'enlarged'` | `'default'` on every mount | `'enlarged'` mounts `<EnlargedView attractExempt>` containing `<GameBoard>`. Switching back to `'default'` unmounts it and discards the board (FR-017, research R6). |
| `pendingFocus` (ref) | `'play' \| null` | `null` | Set on return; consumed after the `default` render to focus Play (FR-007). A ref, not state, so focus never causes a render. |

```text
  mount ──► default ──(tap Play)──► enlarged ──(tap return)──► default
                                        │
                                        └──(idle reset: tab unmounts)──► [gone]
```

## 6. Input tracking (transient, per `GameBoard` mount)

Owned by `useBoardInput.ts`:

| Field | Type | Bound | Cleared |
|-------|------|-------|---------|
| `activePointers` (ref) | `Set<number>` of pointer IDs currently down on the board | Number of simultaneous contacts, in practice ≤10 | Each ID on its `pointerup` / `pointercancel` / `lostpointercapture`; the whole set on unmount |

Held in a ref, so pointer bookkeeping never causes a render. Rules:
[contracts/view-states.md](contracts/view-states.md) §3.

## 7. Constants

| Name | Value | Source |
|------|-------|--------|
| `WIN_LINES` | the 8 index triples in §3 | FR-012 |
| `EMPTY_BOARD` | nine `null`s, frozen | FR-002, FR-008 |
| `REACHABLE_POSITIONS` (test only) | `5478` | SC-002, research R4 |

The game adds **no** timing constants. It reuses the kiosk's `IDLE_TIMEOUT_SECONDS = 60` and
`ATTRACT_AFTER_SECONDS = 30` unchanged (spec Assumptions).
