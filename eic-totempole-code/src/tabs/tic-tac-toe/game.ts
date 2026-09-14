/**
 * Tic-Tac-Toe rules. Pure TypeScript: no React, no DOM, no timers, no
 * randomness. Components render this module's output; they never decide
 * game outcomes themselves (specs/004-tic-tac-toe/contracts/game-rules.md).
 */

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export type GameStatus =
  | { readonly kind: 'playing'; readonly turn: Mark }
  | { readonly kind: 'won'; readonly winner: Mark; readonly winningCells: readonly number[] }
  | { readonly kind: 'draw' };

export type GameAction =
  | { readonly type: 'place'; readonly index: number }
  | { readonly type: 'newGame' };

/** The 8 lines a player can complete: 3 rows, 3 columns, 2 diagonals. */
export const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Nine empty cells, frozen so it can never be mutated in place (FR-002, FR-008, G9). */
export const EMPTY_BOARD: Board = Object.freeze([
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]) as Board;

/** 1-based row/column of a board index, 0-8 in row-major order (data-model.md §2). */
export function cellPosition(index: number): { readonly row: number; readonly column: number } {
  return { row: Math.floor(index / 3) + 1, column: (index % 3) + 1 };
}

/**
 * Derives the game's status from the board. Never stored — recomputed every
 * call, which is cheap (at most 8 lines x 3 cells) and keeps contradictory
 * states (e.g. "X's turn" on a board where X already won) unrepresentable
 * (data-model.md §3, contract G1-G5).
 */
export function evaluate(board: Board): GameStatus {
  // G1/G2: line check BEFORE the full-board check, and collect every
  // completed line's cells (not just the first one found), so a double-line
  // win reports the union (FR-013).
  let winner: Mark | undefined;
  const winningCellSet = new Set<number>();

  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const markA = board[a];
    if (markA !== null && markA === board[b] && markA === board[c]) {
      winner = markA;
      winningCellSet.add(a);
      winningCellSet.add(b);
      winningCellSet.add(c);
    }
  }

  if (winner) {
    return {
      kind: 'won',
      winner,
      winningCells: [...winningCellSet].sort((x, y) => x - y),
    };
  }

  // G3: draw only once no line is complete.
  if (board.every((cell) => cell !== null)) {
    return { kind: 'draw' };
  }

  // G4: X moves first and whenever the counts are equal.
  const xCount = board.filter((cell) => cell === 'X').length;
  const oCount = board.filter((cell) => cell === 'O').length;
  return { kind: 'playing', turn: xCount === oCount ? 'X' : 'O' };
}

/**
 * `place` changes the board only for a legal move on a game still in
 * progress; every other case returns the SAME reference so React skips the
 * render (G6, G7). `newGame` always returns EMPTY_BOARD, the same reference
 * when the board already is empty (G8).
 */
export function gameReducer(board: Board, action: GameAction): Board {
  if (action.type === 'newGame') {
    return EMPTY_BOARD;
  }

  const { index } = action;
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return board;
  }
  if (board[index] !== null) {
    return board;
  }
  const status = evaluate(board);
  if (status.kind !== 'playing') {
    return board;
  }

  const next = [...board] as Cell[];
  next[index] = status.turn;
  return next as unknown as Board;
}
