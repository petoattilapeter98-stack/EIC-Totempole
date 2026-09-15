import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { App } from '../../app/App';
import { agenda } from './agenda.static';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * Runs in REAL Chromium at the 1920x1280 design viewport, not jsdom.
 *
 * The accordion is the one feature in this tab that can break Constitution II:
 * an open row takes height the other rows have to give up, and whether they
 * actually fit is a question only a layout engine can answer. jsdom returns 0
 * for every rect, so the same assertions there would pass vacuously.
 *
 * The whole App is mounted rather than the tab alone, because the budget being
 * tested is the one left over after the header, hero, nav and footer have taken
 * their share - measuring the tab in isolation would test a height the kiosk
 * never gives it.
 */

const MIN_TOUCH_TARGET = 64;
const MIN_TOUCH_GAP = 16;

/**
 * Comfortably longer than --motion-accordion (320ms).
 *
 * The accordion animates `flex-grow`, so every height in this file is in motion
 * for a third of a second after a tap. Measuring without waiting reads a frame
 * part-way through the transition - which is how an earlier version of this
 * suite "proved" the collapsed rows were 102px tall.
 */
const SETTLE_MS = 500;

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

function rowButtons(): HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('aria-expanded') && el.hasAttribute('aria-controls'));
}

function renderApp() {
  return render(
    <KioskProvider>
      <App />
    </KioskProvider>,
  );
}

describe('Board Agenda accordion at 1920x1280', () => {
  it('renders one toggle per session', () => {
    renderApp();
    expect(rowButtons()).toHaveLength(agenda.sessions.length);
  });

  it('never scrolls the page with any session expanded (FR-020, SC-004)', async () => {
    const user = userEvent.setup();
    renderApp();

    expectNoOverflow('all collapsed');

    // Every row, not a representative one: the last row is the one whose detail
    // panel sits closest to the footer, and the live row carries extra chrome.
    for (const [index, button] of rowButtons().entries()) {
      await user.click(button);
      // Mid-transition too: a frame that overflows is still a frame the kiosk
      // renders, so the page must not scroll at any point during the open.
      expectNoOverflow(`session ${index} opening`);
      await settle();
      expectNoOverflow(`session ${index} expanded`);
    }

    // And back to rest.
    const open = rowButtons().find((el) => el.getAttribute('aria-expanded') === 'true');
    if (open) await user.click(open);
    await settle();
    expectNoOverflow('collapsed again');
  });

  it('keeps every row above the 64px touch minimum while one is expanded', async () => {
    // The collapsed rows tighten up to free height for the open one. This is
    // the assertion that stops that tightening from quietly crossing the
    // Constitution III floor.
    const user = userEvent.setup();
    renderApp();

    await user.click(rowButtons()[0]!);
    await settle();

    for (const [index, button] of rowButtons().entries()) {
      const { width, height } = button.getBoundingClientRect();
      expect(height, `row ${index}: height while row 0 is open`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET,
      );
      expect(width, `row ${index}: width`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });

  it('keeps 16px between adjacent row targets (FR-021, SC-008)', async () => {
    const user = userEvent.setup();
    renderApp();

    const check = (label: string) => {
      const rects = rowButtons().map((el) => el.getBoundingClientRect());
      for (let i = 1; i < rects.length; i += 1) {
        expect(rects[i]!.top - rects[i - 1]!.bottom, `${label}: gap ${i - 1}-${i}`).toBeGreaterThanOrEqual(
          MIN_TOUCH_GAP,
        );
      }
    };

    check('all collapsed');
    await user.click(rowButtons()[2]!);
    await settle();
    check('middle row expanded');
  });

  it('gives the expanded row real height to show its detail in', async () => {
    // A panel that "opens" into two pixels is the failure this guards: the
    // no-overflow test above would still pass, and the feature would be
    // pointless.
    const user = userEvent.setup();
    renderApp();

    const button = rowButtons()[0]!;
    const collapsedHeight = button.closest('li')!.getBoundingClientRect().height;

    await user.click(button);
    await settle();

    const expandedHeight = button.closest('li')!.getBoundingClientRect().height;
    expect(expandedHeight).toBeGreaterThan(collapsedHeight + 60);

    const panelId = button.getAttribute('aria-controls')!;
    const panel = document.getElementById(panelId)!;
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(60);
    // Clamped, never scrolled (Constitution II).
    expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1);
  });
});
