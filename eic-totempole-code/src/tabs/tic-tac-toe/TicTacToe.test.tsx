import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../app/App';
import { KioskProvider } from '../../context/KioskContext';
import { TABS } from '../registry';
import TicTacToe from './TicTacToe';

/**
 * Contract: specs/004-tic-tac-toe/contracts/view-states.md §1, §7
 */

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture ??= vi.fn();
  HTMLElement.prototype.releasePointerCapture ??= vi.fn();
});

function renderTab() {
  return render(
    <KioskProvider>
      <TicTacToe />
    </KioskProvider>,
  );
}

describe('TicTacToe — default view (V1, V0)', () => {
  it('renders the heading, intro and Play on mount', () => {
    renderTab();
    expect(screen.getByRole('heading', { name: 'Tic-Tac-Toe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Game board' })).not.toBeInTheDocument();
  });
});

describe('TicTacToe — opening and closing the game (V2, V3, V5, E7)', () => {
  it('Play opens the game view with an empty board and X to move', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(screen.getByRole('group', { name: 'Game board' })).toBeInTheDocument();
    const emptyCells = screen.getAllByRole('button', { name: /empty/ });
    expect(emptyCells).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent(/X/);
  });

  it('moves focus to the return control on open', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(screen.getByRole('button', { name: 'Close game' })).toHaveFocus();
  });

  it('Close returns to the default view and focuses Play', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Play' }));
    await user.click(screen.getByRole('button', { name: 'Close game' }));

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
    expect(screen.queryByRole('group', { name: 'Game board' })).not.toBeInTheDocument();
  });

  it('closing mid-game and reopening gives a fresh empty board (V2, V3, FR-017)', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Play' }));
    const firstCell = screen.getAllByRole('button', { name: /empty/ })[0]!;
    fireEvent.pointerDown(firstCell, { pointerId: 1, pointerType: 'touch', button: 0, bubbles: true });
    expect(screen.getByRole('status')).toHaveTextContent(/O/); // X placed, O's turn

    await user.click(screen.getByRole('button', { name: 'Close game' }));
    await user.click(screen.getByRole('button', { name: 'Play' }));

    const emptyCells = screen.getAllByRole('button', { name: /empty/ });
    expect(emptyCells).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent(/X/);
  });
});

describe('TicTacToe — attract exemption attribute (V6)', () => {
  it('carries no data-attract-exempt in the default view', () => {
    renderTab();
    expect(document.querySelector('[data-attract-exempt]')).toBeNull();
  });

  it('carries data-attract-exempt only while the game view is open', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(document.querySelector('[data-attract-exempt]')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Close game' }));
    expect(document.querySelector('[data-attract-exempt]')).toBeNull();
  });
});

describe('TicTacToe — never uses the browser Fullscreen API (E1a)', () => {
  it('does not call requestFullscreen when the game view opens', async () => {
    const user = userEvent.setup();
    const requestFullscreen = vi.fn();
    Element.prototype.requestFullscreen =
      requestFullscreen as unknown as typeof Element.prototype.requestFullscreen;

    renderTab();
    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(document.fullscreenElement ?? null).toBeNull();
  });
});

describe('TicTacToe — SC-001: reachable in exactly two taps from any destination', () => {
  const otherTabLabels = TABS.filter((t) => t.meta.id !== 'tic-tac-toe').map((t) => t.meta.label.en);

  it.each(otherTabLabels)('from %s, tapping the tab then Play shows an empty board', async (label) => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(label) }));
    await user.click(screen.getByRole('tab', { name: /Tic-Tac-Toe/ }));
    await user.click(screen.getByRole('button', { name: 'Play' }));

    const emptyCells = screen.getAllByRole('button', { name: /empty/ });
    expect(emptyCells).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent(/X/);
  });
});

describe('TicTacToe — no timers added while idle (V1 sanity)', () => {
  it('adds no timers across 20 repeated open/close cycles', () => {
    vi.useFakeTimers();
    renderTab();

    // KioskProvider itself installs exactly one persistent interval for the
    // whole app's idle countdown (useIdleReset — "one interval for the whole
    // app", by design). That is the baseline; this test asserts the game
    // adds nothing ON TOP of it, not that the count is zero.
    const baseline = vi.getTimerCount();

    // fireEvent.click, not userEvent — userEvent's multi-step interaction
    // simulation depends on internal delays that do not reliably resolve
    // combined with fake timers, but nothing under test here needs anything
    // beyond a plain click firing onClick.
    for (let i = 0; i < 20; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      fireEvent.click(screen.getByRole('button', { name: 'Close game' }));
    }

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(vi.getTimerCount()).toBe(baseline);
    vi.useRealTimers();
  });
});

describe('TicTacToe — idle reset (US3, FR-018, FR-019)', () => {
  function renderAppWithShortIdle() {
    return render(
      <KioskProvider idleTimeoutSeconds={5}>
        <App />
      </KioskProvider>,
    );
  }

  function tapCell(cell: Element, pointerId: number) {
    // pointerdown AND pointerup — a real, complete tap. Without the release,
    // the pointer id stays "stuck" in useBoardInput's tracked set (by design,
    // for N2/N3), and every LATER tap on the board would be blocked.
    fireEvent.pointerDown(cell, { pointerId, pointerType: 'touch', button: 0, bubbles: true });
    fireEvent.pointerUp(cell, { pointerId, pointerType: 'touch', bubbles: true });
  }

  it('discards an in-progress game and returns to Board Agenda after the idle period (FR-018, SC-007)', () => {
    vi.useFakeTimers();
    renderAppWithShortIdle();

    fireEvent.click(screen.getByRole('tab', { name: /Tic-Tac-Toe/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    const cells = screen.getAllByRole('button', { name: /empty/ });
    tapCell(cells[0]!, 1); // X
    tapCell(cells[1]!, 2); // O
    expect(screen.getByRole('status')).toHaveTextContent(/X/); // back to X's turn

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole('tab', { name: /Board Agenda/ })).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('[data-enlarged-view]')).toBeNull();

    // The next Play gets a fresh board — no visitor inherits another's game.
    fireEvent.click(screen.getByRole('tab', { name: /Tic-Tac-Toe/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getAllByRole('button', { name: /empty/ })).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent(/X/);

    vi.useRealTimers();
  });

  it('does not reset an actively played game out from under its players (FR-019)', () => {
    vi.useFakeTimers();
    renderAppWithShortIdle();

    fireEvent.click(screen.getByRole('tab', { name: /Tic-Tac-Toe/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    // A move every 4s — inside the 5s idle window each time — for five moves,
    // each on a different empty cell (a second tap on the SAME cell would be
    // an intentional no-op per FR-009/G7, not a second move).
    for (let i = 0; i < 5; i += 1) {
      const cells = screen.getAllByRole('button', { name: /empty/ });
      tapCell(cells[0]!, i + 1);
      act(() => {
        vi.advanceTimersByTime(4000);
      });
    }

    // The game view is still open, and the board still reflects five moves —
    // the kiosk never fell back to Board Agenda mid-game.
    expect(screen.getByRole('group', { name: 'Game board' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /empty/ })).toHaveLength(4);

    vi.useRealTimers();
  });
});
