import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../context/KioskContext';
import { TABS } from '../tabs/registry';
import { App } from './App';

import '../styles/tokens.css';
import '../styles/fonts.css';
import '../styles/reset.css';

/**
 * Runs in REAL Chromium at the 1920x1280 design viewport, not jsdom.
 *
 * jsdom has no layout engine: scrollHeight, clientHeight and
 * getBoundingClientRect() all return 0 there, so every assertion in this file
 * would pass vacuously — a false green on the single most important
 * constitutional constraint (Principle II). See research.md R6.
 */

const MIN_TOUCH_TARGET = 64;
const MIN_TOUCH_GAP = 16;

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

describe('App shell layout at 1920x1280', () => {
  it('renders at the design viewport', () => {
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    expect(window.innerWidth).toBe(1920);
    expect(window.innerHeight).toBe(1280);
  });

  it('never scrolls the page, on any tab (FR-020, SC-004)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    expectNoOverflow('initial render');

    for (const { meta } of TABS) {
      await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
      expectNoOverflow(`tab: ${meta.id}`);
    }
  });

  it('gives the content region all remaining height below the nav (FR-016)', () => {
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    const panel = screen.getByRole('tabpanel');
    const nav = screen.getByRole('tablist');

    const panelRect = panel.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    expect(panelRect.top).toBeGreaterThan(navRect.bottom);
    expect(panelRect.height).toBeGreaterThan(0);
    // The content row is the flexible one, so it should be the tallest region.
    expect(panelRect.height).toBeGreaterThan(navRect.height);
  });

  it('meets the 64px minimum touch target on every interactive element (FR-021, SC-008)', () => {
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    const interactive = [
      ...screen.getAllByRole('tab'),
      ...screen.getAllByRole('button'),
    ];

    expect(interactive.length).toBeGreaterThanOrEqual(TABS.length + 1);

    for (const el of interactive) {
      const { width, height } = el.getBoundingClientRect();
      const name = el.textContent?.trim() || el.getAttribute('aria-label') || '(unnamed)';
      expect(width, `${name}: width`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(height, `${name}: height`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });

  it('keeps at least 16px between adjacent nav targets (FR-021, SC-008)', () => {
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    const rects = screen.getAllByRole('tab').map((t) => t.getBoundingClientRect());

    for (let i = 1; i < rects.length; i += 1) {
      const prev = rects[i - 1]!;
      const curr = rects[i]!;
      expect(curr.left - prev.right, `gap between tab ${i - 1} and ${i}`).toBeGreaterThanOrEqual(
        MIN_TOUCH_GAP,
      );
    }
  });

  it('keeps the footer countdown visible on every tab (FR-017)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    for (const { meta } of TABS) {
      await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));

      const countdown = screen.getByTestId('idle-countdown');
      const rect = countdown.getBoundingClientRect();

      expect(rect.height, `${meta.id}: countdown not rendered`).toBeGreaterThan(0);
      expect(rect.bottom, `${meta.id}: countdown pushed off-screen`).toBeLessThanOrEqual(
        window.innerHeight,
      );
    }
  });
});
