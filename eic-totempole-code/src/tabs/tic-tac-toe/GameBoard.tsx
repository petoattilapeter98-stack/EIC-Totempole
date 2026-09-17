import { useReducer } from 'react';
import { Circle, RotateCcw, X as XIcon } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { EMPTY_BOARD, evaluate, gameReducer } from './game';
import { getGameStrings } from './strings';
import { useBoardInput } from './useBoardInput';
import styles from './TicTacToe.module.css';

/**
 * The playable board, status line and New game control.
 * specs/004-tic-tac-toe/contracts/view-states.md §2-§4
 *
 * Mounted only while the enlarged game view is open (TicTacToe.tsx). Every
 * mount starts from EMPTY_BOARD via `useReducer`'s lazy-free initial state, so
 * a fresh Play (or a fresh mount after idle reset) always gets a fresh game —
 * no reset logic needed (research R6).
 */
export default function GameBoard() {
  const { locale } = useKiosk();
  const s = getGameStrings(locale);
  const [board, dispatch] = useReducer(gameReducer, EMPTY_BOARD);
  const status = evaluate(board);

  const dispatchPlace = (index: number) => dispatch({ type: 'place', index });
  const { boardProps, cellProps } = useBoardInput(dispatchPlace);

  const winningCells = status.kind === 'won' ? new Set(status.winningCells) : null;
  const gameOver = status.kind !== 'playing';

  const statusText =
    status.kind === 'playing' ? s.turn(status.turn) : status.kind === 'won' ? s.wins(status.winner) : s.draw;

  return (
    <div className={styles.game}>
      <div
        className={styles.board}
        role="group"
        aria-label={s.boardName}
        {...boardProps}
      >
        {board.map((cell, index) => {
          const isWinning = winningCells?.has(index) ?? false;
          const disabled = cell !== null || gameOver;
          return (
            <button
              key={index}
              type="button"
              className={`${styles.cell} ${isWinning ? styles.winningCell : ''}`}
              aria-label={s.cellName(index, cell, isWinning)}
              // NEVER the `disabled` attribute: it would drop focus to
              // <body> when the game ends under a focused cell (contract A3).
              aria-disabled={disabled}
              {...cellProps(index)}
            >
              {cell === 'X' ? (
                <XIcon className={styles.markX} aria-hidden="true" />
              ) : cell === 'O' ? (
                <Circle className={styles.markO} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={styles.sidePanel}>
        {/*
          Text only — no leading mark icon. The mark is already spelled out in
          statusText ("X's turn" / "O wins!"), and an icon beside it duplicated
          the same information rather than adding to it.
        */}
        <p className={styles.status} role="status">
          {statusText}
        </p>

        <button
          type="button"
          className={styles.newGame}
          onClick={() => dispatch({ type: 'newGame' })}
        >
          <RotateCcw className={styles.newGameIcon} aria-hidden="true" />
          <span>{s.newGame}</span>
        </button>
      </div>
    </div>
  );
}
