import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../../app/App';
import { KioskProvider } from '../../context/KioskContext';
import { STRINGS } from './strings';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * SC-008 scripted soak run: plays 500 consecutive games and checks the DOM
 * does not accumulate nodes across them (a cheap proxy for "no leak" that
 * runs in seconds rather than days). Skipped by default — it takes minutes —
 * so it does not slow the normal `npm run test:layout` loop.
 *
 * Run it explicitly with:
 *   VITE_SOAK=1 npx vitest run --project layout src/tabs/tic-tac-toe/TicTacToe.soak.browser.test.tsx
 *
 * This automated run is only half of SC-008 (specs/004-tic-tac-toe/
 * quickstart.md §2.7): it stands in for "play 500 games" but NOT for the
 * 72-hour idle soak on the physical device, which needs the kiosk hardware
 * and cannot be simulated here.
 */
describe.skipIf(!import.meta.env.VITE_SOAK)('Tic-Tac-Toe soak (SC-008)', () => {
  it('plays 500 consecutive games without accumulating DOM nodes', async () => {
    // delay: null — realistic per-interaction timing is not the point of this
    // test and multiplied by 3000 clicks (500 games x 6) it pushed the run
    // well past a 120s timeout; only the resulting state matters here.
    const user = userEvent.setup({ delay: null });
    // Idle/attract pushed far out — the soak is about the game loop itself,
    // not the shell's own timers.
    render(
      <KioskProvider idleTimeoutSeconds={100000} attractAfterSeconds={100000}>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.heading.en) }));
    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.click(screen.getByRole('button', { name: STRINGS.play.en }));

    const nodeCounts: number[] = [];
    const heapSamples: number[] = [];

    // A fixed winning sequence: X takes the top row, O plays elsewhere.
    const winningOrder = [0, 3, 1, 4, 2];

    for (let game = 1; game <= 500; game += 1) {
      const cells = screen.getAllByRole('button', { name: /empty|üres/ });
      for (const index of winningOrder) {
        // eslint-disable-next-line no-await-in-loop -- sequential moves, intentional
        await user.click(cells[index]!);
      }
      // eslint-disable-next-line no-await-in-loop -- must finish this game before starting the next
      await user.click(screen.getByRole('button', { name: STRINGS.newGame.en }));

      if (game % 100 === 0) {
        nodeCounts.push(document.getElementsByTagName('*').length);
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        if (memory) heapSamples.push(memory.usedJSHeapSize);
      }
    }

    console.log('SOAK node counts per 100 games:', nodeCounts);
    if (heapSamples.length > 0) {
      console.log('SOAK heap samples (bytes):', heapSamples);
    }

    // The DOM node count after game 500 must equal the count after game 100
    // — no accumulation across 400 further games.
    expect(nodeCounts[nodeCounts.length - 1]).toBe(nodeCounts[0]);

    // The board is still responsive after 500 games.
    const finalCells = screen.getAllByRole('button', { name: /empty|üres/ });
    expect(finalCells).toHaveLength(9);
  }, 300_000);
});
