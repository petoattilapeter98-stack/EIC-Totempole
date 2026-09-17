# Contract: Game Rules

**Feature**: [../spec.md](../spec.md) FR-008 to FR-016, SC-002, SC-003 | **Research**: [../research.md](../research.md) R4 | **Data model**: [../data-model.md](../data-model.md) §1–4

`src/tabs/tic-tac-toe/game.ts` is pure TypeScript: no React, no DOM, no timers, no randomness. It is
the single source of truth for what a board means. Components render its output and never decide
game outcomes themselves.

---

## 1. Exports

```ts
type Mark = 'X' | 'O';
type Cell = Mark | null;
type Board = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

type GameStatus =
  | { readonly kind: 'playing'; readonly turn: Mark }
  | { readonly kind: 'won'; readonly winner: Mark; readonly winningCells: readonly number[] }
  | { readonly kind: 'draw' };

type GameAction = { readonly type: 'place'; readonly index: number } | { readonly type: 'newGame' };

const WIN_LINES: readonly (readonly [number, number, number])[];
const EMPTY_BOARD: Board;

function evaluate(board: Board): GameStatus;
function gameReducer(board: Board, action: GameAction): Board;
function cellPosition(index: number): { readonly row: number; readonly column: number }; // 1-based
```

## 2. `evaluate`

| ID | Rule | Requirement |
|----|------|-------------|
| G1 | If any line in `WIN_LINES` holds three equal non-null marks, the result is `won` with that `winner`. This is checked **before** G3. | FR-012 |
| G2 | `winningCells` is the ascending, de-duplicated union of the indices of **every** completed line. | FR-013 |
| G3 | Otherwise, if no cell is `null`, the result is `draw`. | FR-012 |
| G4 | Otherwise the result is `playing`, with `turn = 'X'` when the X and O counts are equal and `'O'` otherwise. | FR-009, FR-011 |
| G5 | Returns a new object each call, and callers must not rely on its identity. It is cheap enough to recompute every render: at most 8 × 3 cell reads. | SC-004 |

## 3. `gameReducer`

| ID | Rule | Requirement |
|----|------|-------------|
| G6 | `place(index)` changes the board only when `evaluate(board).kind === 'playing'`, `index` is an integer in 0–8, and `board[index] === null`. The new board has `turn` at `index` and is otherwise identical. | FR-009 |
| G7 | In **every** other case `place` returns the **same reference** it was given. It never throws and never returns an equal copy, so React skips the render. | FR-009, FR-015 |
| G8 | `newGame` returns `EMPTY_BOARD`, which is the same reference if the board already is `EMPTY_BOARD`. | FR-016 |
| G9 | Input boards are never mutated. `EMPTY_BOARD` is frozen. | |

## 4. Invariants over all reachable boards

For every board reachable from `EMPTY_BOARD` by any sequence of `gameReducer` actions:

| ID | Invariant |
|----|-----------|
| I1 | `count(X) − count(O)` ∈ {0, 1}. |
| I2 | Not both players hold a completed line. |
| I3 | A `won` status has its `winner` as the last mover: X wins ⇒ `count(X) = count(O) + 1`; O wins ⇒ counts are equal. |
| I4 | `winningCells.length` ∈ {3, 5}. Two parallel lines would need 6 marks of one player, which is impossible, so any double line shares exactly one cell. |
| I5 | Once `evaluate` is `won` or `draw`, only `newGame` can change the board. |

## 5. Test obligations (`game.test.ts`, unit project)

| Test | Asserts |
|------|---------|
| Exhaustive walk | Depth-first search from `EMPTY_BOARD`, applying `place` at every empty index of every non-terminal board and deduplicating by serialized board. It reaches **exactly 5,478** positions (SC-002). |
| Oracle agreement | For every reached position, `evaluate` equals an independent oracle that encodes each player's cells as a 9-bit mask and tests the 8 line masks. The oracle must not import `WIN_LINES`. |
| Invariants | I1–I4 on every reached position. |
| No-op moves | For every reached position, `place` on each occupied index, and on every index when terminal, returns the identical reference (G7). `place(-1)`, `place(9)` and `place(1.5)` do the same. |
| Named cases | Top-row X win; O column win; both diagonals; draw; win on the ninth move (FR-012); double-line win giving 5 `winningCells` (FR-013). These duplicate the exhaustive walk on purpose: they are the readable documentation of the spec's edge cases. |
| `newGame` | From mid-game, a won position and a draw, the result is `EMPTY_BOARD` by reference. |
