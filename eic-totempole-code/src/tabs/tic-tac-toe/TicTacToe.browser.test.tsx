import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { userEvent as realUser } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';

import { App } from '../../app/App';
import { KioskProvider } from '../../context/KioskContext';
import { STRINGS as MAP_STRINGS } from '../restaurant-map/strings';
import { STRINGS } from './strings';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * Runs in REAL Chromium at the 1920x1280 design viewport (see
 * RestaurantMap.browser.test.tsx for why jsdom cannot make these assertions).
 *
 * Contract: specs/004-tic-tac-toe/contracts/view-states.md §7
 */

const MIN_TOUCH_TARGET = 64;
const MIN_TOUCH_GAP = 16;

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

async function settle() {
  // ContentRegion's entry animation applies a transform for 0.34s on tab
  // change — see RestaurantMap.browser.test.tsx for why this matters for
  // position:fixed descendants.
  await new Promise((resolve) => setTimeout(resolve, 450));
}

async function openTicTacToeTab(user: ReturnType<typeof userEvent.setup>, hungarian = false) {
  render(
    <KioskProvider>
      <App />
    </KioskProvider>,
  );
  if (hungarian) {
    await user.click(screen.getByRole('button', { name: 'Switch language to Hungarian' }));
  }
  const label = hungarian ? STRINGS.heading.hu : STRINGS.heading.en;
  await user.click(screen.getByRole('tab', { name: new RegExp(label) }));
  await settle();
}

async function openGame(user: ReturnType<typeof userEvent.setup>, hungarian = false) {
  await openTicTacToeTab(user, hungarian);
  const play = hungarian ? STRINGS.play.hu : STRINGS.play.en;
  await user.click(screen.getByRole('button', { name: play }));
}

function boardCells() {
  return screen.getAllByRole('button', { name: /Row \d|sor/ });
}

describe.each([
  ['en', false],
  ['hu', true],
] as const)('Tic-Tac-Toe layout at 1920x1280 (%s)', (_label, hungarian) => {
  it('never scrolls the page in the default view', async () => {
    const user = userEvent.setup();
    await openTicTacToeTab(user, hungarian);
    expectNoOverflow('default view');
  });

  it('never scrolls the page with an empty enlarged board', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);
    expectNoOverflow('empty board');
  });

  it('never scrolls the page mid-game', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);
    const cells = boardCells();
    await user.click(cells[0]!);
    await user.click(cells[1]!);
    expectNoOverflow('mid-game');
  });

  it('never scrolls the page when X wins', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);
    const cells = boardCells();
    await user.click(cells[0]!); // X
    await user.click(cells[3]!); // O
    await user.click(cells[1]!); // X
    await user.click(cells[4]!); // O
    await user.click(cells[2]!); // X wins
    expectNoOverflow('X wins');
  });

  it('never scrolls the page on a draw', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);
    const cells = boardCells();
    const order = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const index of order) {
      await user.click(cells[index]!);
    }
    expectNoOverflow('draw');
  });

  it('gives every cell and control a 64px touch target with 16px gaps', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);

    const cells = boardCells();
    expect(cells).toHaveLength(9);
    for (const cell of cells) {
      const box = cell.getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }

    // Horizontally adjacent cells within each row (0-1,1-2,3-4,4-5,6-7,7-8).
    const adjacentPairs: readonly (readonly [number, number])[] = [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [6, 7],
      [7, 8],
    ];
    for (const [a, b] of adjacentPairs) {
      const boxA = cells[a]!.getBoundingClientRect();
      const boxB = cells[b]!.getBoundingClientRect();
      const gap = boxB.left - boxA.right;
      expect(gap, `gap between cell ${a} and ${b}`).toBeGreaterThanOrEqual(MIN_TOUCH_GAP - 1);
    }

    const closeLabel = hungarian ? STRINGS.close.hu : STRINGS.close.en;
    const close = screen.getByRole('button', { name: closeLabel }).getBoundingClientRect();
    expect(close.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(close.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('keeps New game a full touch target, on screen and clear of neighbours, in every state (US2, L4)', async () => {
    const user = userEvent.setup();
    await openGame(user, hungarian);

    const newGameLabel = hungarian ? STRINGS.newGame.hu : STRINGS.newGame.en;
    const closeLabel = hungarian ? STRINGS.close.hu : STRINGS.close.en;

    function assertNewGamePlacement(label: string) {
      const newGame = screen.getByRole('button', { name: newGameLabel }).getBoundingClientRect();
      expect(newGame.width, label).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(newGame.height, label).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(newGame.top, label).toBeGreaterThanOrEqual(0);
      expect(newGame.left, label).toBeGreaterThanOrEqual(0);
      expect(newGame.right, label).toBeLessThanOrEqual(window.innerWidth);
      expect(newGame.bottom, label).toBeLessThanOrEqual(window.innerHeight);

      const close = screen.getByRole('button', { name: closeLabel }).getBoundingClientRect();
      const verticalGapFromClose = newGame.top >= close.bottom ? newGame.top - close.bottom : close.top - newGame.bottom;
      expect(verticalGapFromClose, `${label}: gap from return control`).toBeGreaterThanOrEqual(
        MIN_TOUCH_GAP - 1,
      );

      for (const cell of boardCells()) {
        const cellBox = cell.getBoundingClientRect();
        const noOverlap =
          newGame.left >= cellBox.right ||
          cellBox.left >= newGame.right ||
          newGame.top >= cellBox.bottom ||
          cellBox.top >= newGame.bottom;
        expect(noOverlap, `${label}: New game must not overlap a cell`).toBe(true);
      }
    }

    assertNewGamePlacement('empty board');

    const cells = boardCells();
    await user.click(cells[0]!);
    await user.click(cells[1]!);
    assertNewGamePlacement('mid-game');

    await user.click(screen.getByRole('button', { name: newGameLabel }));
    await user.click(boardCells()[0]!);
    await user.click(boardCells()[3]!);
    await user.click(boardCells()[1]!);
    await user.click(boardCells()[4]!);
    await user.click(boardCells()[2]!); // X wins
    assertNewGamePlacement('X wins');

    await user.click(screen.getByRole('button', { name: newGameLabel }));
    const order = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const index of order) {
      await user.click(boardCells()[index]!);
    }
    assertNewGamePlacement('draw');
  });
});

describe('Tic-Tac-Toe layout — computed colours (view-states.md §5)', () => {
  it('pins mark and status ink colours, and a non-colour cue on winning cells', async () => {
    const user = userEvent.setup();
    await openGame(user);

    const cells = boardCells();
    await user.click(cells[0]!); // X
    await user.click(cells[3]!); // O
    await user.click(cells[1]!); // X
    await user.click(cells[4]!); // O
    await user.click(cells[2]!); // X wins top row

    // X ink: --brand-blue-ink #00688F.
    const xIcon = cells[0]!.querySelector('svg')!;
    expect(getComputedStyle(xIcon).color).toBe('rgb(0, 104, 143)');

    // O ink: --brand-orange-ink #A85400.
    const oIcon = cells[3]!.querySelector('svg')!;
    expect(getComputedStyle(oIcon).color).toBe('rgb(168, 84, 0)');

    // Status text: --color-text (brand navy) #011C31.
    const status = screen.getByRole('status');
    expect(getComputedStyle(status).color).toBe('rgb(1, 28, 49)');

    // Winning cells carry a non-colour cue (a ring/shadow), not colour alone.
    const winningCellStyle = getComputedStyle(cells[0]!);
    expect(winningCellStyle.boxShadow).not.toBe('none');

    // A non-winning cell has no such ring.
    const nonWinningCellStyle = getComputedStyle(cells[3]!);
    expect(nonWinningCellStyle.boxShadow).toBe('none');
  });
});

describe('Tic-Tac-Toe layout — six-tab nav (research R7)', () => {
  it('shows every nav label without truncation in English and Hungarian', async () => {
    const user = userEvent.setup();
    await openTicTacToeTab(user, false);

    let tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    for (const tab of tabs) {
      const label = tab.querySelector('[class*="label"]');
      if (label) {
        expect((label as HTMLElement).scrollWidth).toBeLessThanOrEqual((label as HTMLElement).clientWidth + 1);
      }
    }
    expectNoOverflow('six tabs, en');

    await user.click(screen.getByRole('button', { name: 'Switch language to Hungarian' }));
    tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    for (const tab of tabs) {
      const label = tab.querySelector('[class*="label"]');
      if (label) {
        expect((label as HTMLElement).scrollWidth).toBeLessThanOrEqual((label as HTMLElement).clientWidth + 1);
      }
    }
    expectNoOverflow('six tabs, hu');
  });
});

describe('Tic-Tac-Toe layout — EnlargedView behaviour', () => {
  it('covers the footer while the game view is open', async () => {
    const user = userEvent.setup();
    await openGame(user);

    const root = document.querySelector('[data-enlarged-view]');
    expect(root).not.toBeNull();

    const footer = document.querySelector('footer');
    expect(footer).not.toBeNull();
    const footerBox = footer!.getBoundingClientRect();
    const hit = document.elementFromPoint(
      footerBox.left + footerBox.width / 2,
      footerBox.top + footerBox.height / 2,
    );
    expect(root!.contains(hit)).toBe(true);
  });

  it('stays at full opacity in attract mode while enlarged, and dims in the default view (SC-011, FR-020)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider attractAfterSeconds={1}>
        <App />
      </KioskProvider>,
    );
    await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.heading.en) }));
    await settle();
    await user.click(screen.getByRole('button', { name: STRINGS.play.en }));
    await new Promise((resolve) => setTimeout(resolve, 3200));

    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    expect(getComputedStyle(main!).opacity).toBe('1');

    await user.click(screen.getByRole('button', { name: STRINGS.close.en }));
    await new Promise((resolve) => setTimeout(resolve, 3200));
    expect(getComputedStyle(main!).opacity).toBe('0.16');
  });

  it('a real keyboard Enter on a focused empty cell places a mark (N4)', async () => {
    const user = userEvent.setup();
    await openGame(user);

    const cells = boardCells();
    (cells[0] as HTMLElement).focus();
    await realUser.keyboard('{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent(/O/);
  });

  it('exits the game view on idle reset, and attract resumes normally afterward (US3, FR-018, FR-020)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider idleTimeoutSeconds={3} attractAfterSeconds={1}>
        <App />
      </KioskProvider>,
    );
    await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.heading.en) }));
    await settle();
    await user.click(screen.getByRole('button', { name: STRINGS.play.en }));
    const cell = boardCells()[0]!;
    await user.click(cell);

    // Idle reset fires at 3s, remounting <main> for Board Agenda already in
    // attract mode (attractAfterSeconds=1 has long since passed). That fresh
    // <main> starts its dim transition from opacity 1, which itself takes up
    // to 1.4s (.attract .recede's transition-duration) — the wait has to
    // clear idleTimeoutSeconds AND that transition, not just the former.
    await new Promise((resolve) => setTimeout(resolve, 5200));

    expect(document.querySelector('[data-enlarged-view]')).toBeNull();
    expect(screen.getByRole('tab', { name: /Board Agenda/ })).toHaveAttribute('aria-selected', 'true');

    // Attract mode works as usual once the game view is gone: <main> is back
    // to dimming with the rest of the shell (the exemption ended with the
    // view, not with attract mode itself).
    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    expect(getComputedStyle(main!).opacity).toBe('0.16');
  });

  it('the game and map return controls share the same placement and size (E5, FR-004)', async () => {
    // Width is NOT compared: "Close game" and "Close enlarged map" are
    // different lengths, so the buttons are legitimately different widths —
    // FR-004 requires matching placement and touch-target SIZE (height), not
    // identical pixel width for different label text. Top and right anchor
    // to the same formula (EnlargedView.module.css .returnControl), so those
    // must match exactly regardless of label length.
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.heading.en) }));
    await settle();
    await user.click(screen.getByRole('button', { name: STRINGS.play.en }));
    const gameClose = screen.getByRole('button', { name: STRINGS.close.en }).getBoundingClientRect();
    await user.click(screen.getByRole('button', { name: STRINGS.close.en }));

    await user.click(screen.getByRole('tab', { name: new RegExp(MAP_STRINGS.listHeading.en) }));
    await settle();
    await user.click(screen.getByRole('button', { name: MAP_STRINGS.expandLabel.en }));
    const mapClose = screen
      .getByRole('button', { name: MAP_STRINGS.collapseLabel.en })
      .getBoundingClientRect();

    expect(gameClose.top).toBeCloseTo(mapClose.top, 0);
    expect(gameClose.right).toBeCloseTo(mapClose.right, 0);
    expect(gameClose.height).toBeCloseTo(mapClose.height, 0);
  });
});
