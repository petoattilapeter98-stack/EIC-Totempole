import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../../app/App';
import { KioskProvider } from '../../context/KioskContext';
import { TABS } from '../registry';
import { RESTAURANTS } from './restaurants.static';
import { STRINGS } from './strings';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * Runs in REAL Chromium at the 1920x1280 design viewport, not jsdom.
 *
 * These assertions are meaningless anywhere else: jsdom has no layout engine,
 * so scrollHeight, clientHeight and getBoundingClientRect() all return 0 and
 * every check here would pass vacuously — a false green on Constitution II and
 * III, the two guarantees a kiosk cannot recover from breaking.
 *
 * Rendered through the whole <App/> rather than the tab alone, because the
 * no-scroll guarantee is a property of the shell plus the tab together.
 */

const MIN_TOUCH_TARGET = 64;
const MIN_TOUCH_GAP = 16;

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

async function openMapTab(user: ReturnType<typeof userEvent.setup>) {
  render(
    <KioskProvider>
      <App />
    </KioskProvider>,
  );
  await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.listHeading.en) }));

  await settleEntry();
}

/**
 * Wait for ContentRegion's entry animation to finish.
 *
 * WHY THIS MATTERS: `.enter` applies a `transform` for 0.34s on every tab
 * change, and a transformed ancestor becomes the containing block for
 * `position: fixed` descendants. Measure the expanded panel while it runs and
 * you get the content region's box (~1838px) instead of the viewport's 1920 —
 * the transient RestaurantMap.module.css documents.
 *
 * This waits on the ANIMATION, not on a duration. The previous fixed 450ms left
 * only ~110ms of headroom over the 340ms animation, which is fine on an idle
 * machine and not fine on a busy one: under load the click-to-animation-start
 * delay alone eats the margin, and the suite fails roughly one run in three with
 * `expected 1838 to be 1920`.
 *
 * `panel.getAnimations()` rather than `document.getAnimations()` deliberately:
 * the document-wide call is what forced the fixed wait in the first place,
 * because AmbientAurora runs INFINITE animations that never settle. Scoped to
 * the panel element, the only animation is the one we care about.
 */
async function settleEntry() {
  // A frame first: the animation must exist before we can await it.
  await nextFrame();

  const panel = screen.getByRole('tabpanel');
  await Promise.all(panel.getAnimations().map((a) => a.finished.catch(() => undefined)));

  // And one after: the transform is gone, but the fixed element only snaps back
  // to the viewport on the next layout pass.
  await nextFrame();
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

describe('Restaurant map layout at 1920x1280', () => {
  it('never scrolls the page in the default state (FR-009, SC-004)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    expect(screen.getAllByRole('listitem')).toHaveLength(RESTAURANTS.length);
    expectNoOverflow('map tab, default state');
  });

  it('never scrolls the page in the expanded state (FR-009, SC-004)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    expectNoOverflow('map tab, expanded state');

    await user.click(screen.getByRole('button', { name: STRINGS.collapseLabel.en }));
    expectNoOverflow('map tab, back to default');
  });

  it('keeps every list row on a single line (FR-038, SC-016)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    const rows = screen.getAllByRole('listitem');
    const heights = rows.map((row) => row.getBoundingClientRect().height);
    const shortest = Math.min(...heights);

    for (const [index, height] of heights.entries()) {
      // A wrapped name would make one row visibly taller than the rest, and
      // eight wrapped rows are what pushes the list out of the content region.
      expect(height, `row ${index} wrapped onto a second line`).toBeLessThan(shortest * 1.5);
    }
  });

  it('gives the expand and return controls a 64px touch target (Principle III, SC-009)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    const expand = screen.getByRole('button', { name: STRINGS.expandLabel.en });
    const expandBox = expand.getBoundingClientRect();
    expect(expandBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(expandBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

    await user.click(expand);

    const collapse = screen.getByRole('button', { name: STRINGS.collapseLabel.en });
    const collapseBox = collapse.getBoundingClientRect();
    expect(collapseBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(collapseBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('keeps the return control fully on screen while expanded (Principle III)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    const collapse = screen
      .getByRole('button', { name: STRINGS.collapseLabel.en })
      .getBoundingClientRect();

    // While expanded this control is the only way back, so it must sit fully
    // on screen rather than half off an edge.
    expect(collapse.top).toBeGreaterThanOrEqual(0);
    expect(collapse.right).toBeLessThanOrEqual(window.innerWidth);
    expect(collapse.left).toBeGreaterThanOrEqual(MIN_TOUCH_GAP - 1);
  });

  it('covers the whole viewport when expanded (FR-024)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    const root = document.querySelector('[data-display="expanded"]');
    const box = root?.getBoundingClientRect();

    expect(box?.width).toBe(window.innerWidth);
    expect(box?.height).toBe(window.innerHeight);
  });

  it('renders one nav tab per registry entry without overflow (research R7)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(TABS.length);

    for (const tab of tabs) {
      const box = tab.getBoundingClientRect();
      // The hardcoded repeat(4, 1fr) this replaced would have squeezed or
      // wrapped tabs once the registry grew past four entries.
      expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
    expectNoOverflow(`${TABS.length}-tab nav`);
  });
});
