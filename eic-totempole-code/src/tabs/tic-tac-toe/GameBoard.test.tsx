import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import GameBoard from './GameBoard';

/**
 * Contract: specs/004-tic-tac-toe/contracts/view-states.md §3, §4, §7
 *
 * jsdom has no pointer-capture implementation, so it is stubbed here — the
 * tests only need the calls to not throw and to be traceable, not real
 * platform capture semantics (that is covered on the device, quickstart §2.3).
 */
beforeEach(() => {
  HTMLElement.prototype.setPointerCapture ??= vi.fn();
  HTMLElement.prototype.releasePointerCapture ??= vi.fn();
});

function renderBoard() {
  return render(
    <KioskProvider>
      <GameBoard />
    </KioskProvider>,
  );
}

/** Fires a pointerdown only, WITHOUT releasing — for tests that need a
 * finger to stay "down" so a concurrent second pointer can be tested (N2), or
 * so an explicit pointercancel/lostpointercapture release can be tested (N3).
 * Ordinary moves should use `tap`, below. */
function pointerDown(el: Element, pointerId: number, overrides: Partial<PointerEventInit> = {}) {
  fireEvent.pointerDown(el, {
    pointerId,
    pointerType: 'touch',
    button: 0,
    bubbles: true,
    ...overrides,
  });
}

/** A complete, natural tap: pointerdown followed by pointerup with the same
 * id, releasing the pointer — matching a real finger touch-and-lift. Most
 * tests want this, not the bare `pointerDown` above, which leaves the
 * pointer "stuck" (by design, for N2/N3) and would block every later move on
 * the board. */
function tap(el: Element, pointerId: number) {
  pointerDown(el, pointerId);
  fireEvent.pointerUp(el, { pointerId, pointerType: 'touch', bubbles: true });
}

function cells() {
  return screen.getAllByRole('button', { name: /Row \d, column \d/ });
}

function statusText() {
  return screen.getByRole('status').textContent;
}

describe('GameBoard — turns and moves (US1)', () => {
  it('starts with "X\'s turn"', () => {
    renderBoard();
    expect(statusText()).toMatch(/X/);
  });

  it('alternates turns as cells are tapped', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1);
    expect(statusText()).toMatch(/O/);

    tap(boardCells[1]!, 2);
    expect(statusText()).toMatch(/X/);
  });

  it('ignores a tap on an already-occupied cell', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1);
    const afterFirst = statusText();

    tap(boardCells[0]!, 2);
    expect(statusText()).toBe(afterFirst);
  });
});

describe('GameBoard — results (US1)', () => {
  it('shows X wins with the winning row named in accessible names', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1); // X
    tap(boardCells[3]!, 2); // O
    tap(boardCells[1]!, 3); // X
    tap(boardCells[4]!, 4); // O
    tap(boardCells[2]!, 5); // X wins top row

    expect(statusText()).toMatch(/X/);
    expect(boardCells[0]!.getAttribute('aria-label')).toMatch(/winning line/);
    expect(boardCells[1]!.getAttribute('aria-label')).toMatch(/winning line/);
    expect(boardCells[2]!.getAttribute('aria-label')).toMatch(/winning line/);
    expect(boardCells[3]!.getAttribute('aria-label')).not.toMatch(/winning line/);
  });

  it('shows a draw', () => {
    renderBoard();
    const boardCells = cells();
    // X O X / X O O / O X X
    const order = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    order.forEach((index, i) => tap(boardCells[index]!, i + 1));

    expect(statusText()?.toLowerCase()).toContain('draw');
  });

  it('disables further moves after the game ends, without using the disabled attribute', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1); // X
    tap(boardCells[3]!, 2); // O
    tap(boardCells[1]!, 3); // X
    tap(boardCells[4]!, 4); // O
    tap(boardCells[2]!, 5); // X wins

    for (const cell of cells()) {
      expect(cell).toHaveAttribute('aria-disabled', 'true');
      expect(cell).not.toHaveAttribute('disabled');
    }

    const before = statusText();
    tap(boardCells[8]!, 6);
    expect(statusText()).toBe(before);
  });

  it('keeps focus on the cell that ended the game', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1); // X
    tap(boardCells[3]!, 2); // O
    tap(boardCells[1]!, 3); // X
    tap(boardCells[4]!, 4); // O
    boardCells[2]!.focus();
    tap(boardCells[2]!, 5); // X wins, focused cell

    expect(boardCells[2]).toHaveFocus();
  });

  it('renders a persistent role="status" element whose identity does not change across moves', () => {
    renderBoard();
    const boardCells = cells();
    const status = screen.getByRole('status');

    tap(boardCells[0]!, 1);
    expect(screen.getByRole('status')).toBe(status);

    tap(boardCells[1]!, 2);
    expect(screen.getByRole('status')).toBe(status);
  });
});

describe('GameBoard — New game (US2)', () => {
  it('is present initially, mid-game, and after a win or a draw', () => {
    renderBoard();
    const boardCells = cells();

    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument();

    tap(boardCells[0]!, 1);
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument();

    tap(boardCells[3]!, 2);
    tap(boardCells[1]!, 3);
    tap(boardCells[4]!, 4);
    tap(boardCells[2]!, 5); // X wins
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument();
  });

  it('clears a mid-game board to X to move, with no confirmation step', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1);
    tap(boardCells[3]!, 2);

    fireEvent.click(screen.getByRole('button', { name: 'New game' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(statusText()).toMatch(/X/);
    for (const cell of cells()) {
      expect(cell.getAttribute('aria-label')).toMatch(/empty$/);
      expect(cell).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('clears a won board: removes the result, winning highlight, and disabled state', () => {
    renderBoard();
    const boardCells = cells();

    tap(boardCells[0]!, 1); // X
    tap(boardCells[3]!, 2); // O
    tap(boardCells[1]!, 3); // X
    tap(boardCells[4]!, 4); // O
    tap(boardCells[2]!, 5); // X wins

    fireEvent.click(screen.getByRole('button', { name: 'New game' }));

    expect(statusText()).toMatch(/X/);
    expect(statusText()?.toLowerCase()).not.toContain('win');
    for (const cell of cells()) {
      expect(cell.getAttribute('aria-label')).toMatch(/empty$/);
      expect(cell).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it("keeps the role=\"status\" element's identity across a New game reset", () => {
    renderBoard();
    const boardCells = cells();
    const status = screen.getByRole('status');

    tap(boardCells[0]!, 1);
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));

    expect(screen.getByRole('status')).toBe(status);
  });
});

describe('GameBoard — semantics (A1, A2)', () => {
  it('groups the board with a localized accessible name', () => {
    renderBoard();
    expect(screen.getByRole('group', { name: 'Game board' })).toBeInTheDocument();
  });

  it('names every empty cell with its position', () => {
    renderBoard();
    expect(screen.getByRole('button', { name: 'Row 1, column 1, empty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Row 3, column 3, empty' })).toBeInTheDocument();
  });
});

describe('GameBoard — input rules (N2, N3, N4)', () => {
  it('N2: a second concurrent pointer does not commit while the first is still down', () => {
    renderBoard();
    const boardCells = cells();

    // First finger goes down on cell 0 (commits X) and is never lifted (no
    // pointerup) — its id stays in the tracked set.
    pointerDown(boardCells[0]!, 1);
    expect(statusText()).toMatch(/O/);

    // Second finger goes down on cell 1 WHILE the first is still down.
    pointerDown(boardCells[1]!, 2);

    // Turn must still show O (cell 1 was not committed).
    expect(statusText()).toMatch(/O/);
    expect(boardCells[1]!.getAttribute('aria-label')).toBe('Row 1, column 2, empty');
  });

  it('N3: pointercancel clears the pointer, allowing a later tap to commit', () => {
    renderBoard();
    const boardCells = cells();
    const board = screen.getByRole('group', { name: 'Game board' });

    // A finger touches down and commits X, but is never lifted (no pointerup)
    // — its id stays in the tracked set until something explicitly releases
    // it. Without N3's pointercancel handling, EVERY later tap on the board
    // would be blocked forever (N2 sees the set as permanently non-empty).
    pointerDown(boardCells[0]!, 1);
    expect(statusText()).toMatch(/O/); // committed

    fireEvent.pointerCancel(board, { pointerId: 1, bubbles: true });

    // A different pointer's tap now commits, proving id 1 was released.
    pointerDown(boardCells[1]!, 2);
    expect(statusText()).toMatch(/X/); // second move committed
  });

  it('N3: lostpointercapture clears the pointer, allowing a later tap to commit', () => {
    renderBoard();
    const boardCells = cells();
    const board = screen.getByRole('group', { name: 'Game board' });

    pointerDown(boardCells[0]!, 1);
    expect(statusText()).toMatch(/O/);

    fireEvent(board, new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true }));

    pointerDown(boardCells[1]!, 2);
    expect(statusText()).toMatch(/X/);
  });

  it('N4: click with detail 1 (pointer-originated) does not commit', () => {
    renderBoard();
    const boardCells = cells();

    fireEvent.click(boardCells[0]!, { detail: 1 });
    expect(statusText()).toMatch(/X/); // unchanged, still X's turn
  });

  it('N4: click with detail 0 (keyboard/assistive-tech) commits', () => {
    renderBoard();
    const boardCells = cells();

    fireEvent.click(boardCells[0]!, { detail: 0 });
    expect(statusText()).toMatch(/O/);
  });
});
