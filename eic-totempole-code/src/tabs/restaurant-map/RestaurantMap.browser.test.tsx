import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../../app/App';
import { KioskProvider } from '../../context/KioskContext';
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

  // ContentRegion plays a 0.34s entry animation on every tab change, and that
  // animation applies a `transform` — which makes the content region a
  // containing block for `position: fixed` descendants while it runs. Measuring
  // the expanded panel mid-animation reports the content region's box, not the
  // viewport, so settle first and describe the steady state.
  //
  // A fixed wait rather than awaiting document.getAnimations(): AmbientAurora
  // runs INFINITE animations, so awaiting them all never resolves.
  await new Promise((resolve) => setTimeout(resolve, 450));
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
    // The full-viewport geometry guarantee now lives on the shared
    // EnlargedView panel (`[data-enlarged-view]`), not on this tab's own
    // `[data-display="expanded"]` wrapper: that wrapper stays in .root's
    // normal grid flow (see specs/004-tic-tac-toe/contracts/enlarged-view.md
    // E1) and the panel — which IS position:fixed;inset:0 — is nested inside
    // it. `[data-display="expanded"]` remains this tab's own state marker,
    // used by other tests here and by the footer/geometry tests below.
    const user = userEvent.setup();
    await openMapTab(user);
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    const root = document.querySelector('[data-enlarged-view]');
    const box = root?.getBoundingClientRect();

    expect(box?.width).toBe(window.innerWidth);
    expect(box?.height).toBe(window.innerHeight);
  });

  it('covers the footer while expanded (004 R2)', async () => {
    // The expanded panel's z-index only competes inside <main>'s own stacking
    // context, so before the 004-tic-tac-toe shell fix the footer (same z-index,
    // later in the DOM) painted on top of the "full-viewport" map. This proves
    // it on the current code and must keep passing after EnlargedView lands.
    const user = userEvent.setup();
    await openMapTab(user);
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    await new Promise((resolve) => setTimeout(resolve, 200));

    const root = document.querySelector('[data-display="expanded"]');
    expect(root).not.toBeNull();

    const footer = document.querySelector('footer');
    expect(footer).not.toBeNull();
    const footerBox = footer!.getBoundingClientRect();
    const footerHit = document.elementFromPoint(
      footerBox.left + footerBox.width / 2,
      footerBox.top + footerBox.height / 2,
    );
    expect(root!.contains(footerHit)).toBe(true);

    const tablist = screen.getByRole('tablist');
    const navBox = tablist.getBoundingClientRect();
    const navHit = document.elementFromPoint(navBox.left + navBox.width / 2, navBox.top + navBox.height / 2);
    expect(root!.contains(navHit)).toBe(true);

    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    const headerBox = header!.getBoundingClientRect();
    const headerHit = document.elementFromPoint(
      headerBox.left + headerBox.width / 2,
      headerBox.top + headerBox.height / 2,
    );
    expect(root!.contains(headerHit)).toBe(true);
  });

  it('still dims while expanded in attract mode (004 R1)', async () => {
    // The map does NOT opt out of attract dimming (003 FR-035) — only the
    // EnlargedView caller that passes attractExempt does. This guards against
    // the exemption leaking to a caller that never asked for it.
    const user = userEvent.setup();
    render(
      <KioskProvider attractAfterSeconds={1}>
        <App />
      </KioskProvider>,
    );
    await user.click(screen.getByRole('tab', { name: new RegExp(STRINGS.listHeading.en) }));
    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    await new Promise((resolve) => setTimeout(resolve, 3200));

    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    expect(getComputedStyle(main!).opacity).toBe('0.16');
  });

  it('keeps the collapse control geometry (004 E5)', async () => {
    // Pins the pre-migration rect of the expanded map's return control, measured
    // on the unmodified code before src/components/EnlargedView/ existed. The
    // 004-tic-tac-toe EnlargedView migration (specs/004-tic-tac-toe/contracts/
    // enlarged-view.md E5) must reproduce this rect so the game's return control
    // — which shares the same component — matches what shipped in 003.
    const user = userEvent.setup();
    await openMapTab(user);
    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    const box = screen
      .getByRole('button', { name: STRINGS.collapseLabel.en })
      .getBoundingClientRect();

    // Explicit +/-1px tolerance (not toBeCloseTo's precision-based rounding):
    // the pinned top/right are 1px off the pre-migration measurement because
    // the control used to sit inside .mapArea's 1px border, and EnlargedView's
    // shared return control has no such border to inherit. Width and height
    // are unaffected by that and stay tight.
    const closeTo = (actual: number, expected: number, tolerance: number) =>
      expect(Math.abs(actual - expected), `${actual} within ${tolerance}px of ${expected}`).toBeLessThanOrEqual(
        tolerance,
      );

    closeTo(box.top, 41, 1);
    closeTo(box.right, 1879, 1);
    closeTo(box.width, 229.515625, 1);
    closeTo(box.height, 64, 1);
  });

  it('renders six nav tabs without overflow (research R7, 004 R7)', async () => {
    const user = userEvent.setup();
    await openMapTab(user);

    const tabs = screen.getAllByRole('tab');
    // Updated from 5 to 6 when 004-tic-tac-toe added a sixth tab; re-measured
    // to confirm the auto-columns nav (research R7) still fits every label
    // without wrapping or overflow at 1920x1280.
    expect(tabs).toHaveLength(6);

    for (const tab of tabs) {
      const box = tab.getBoundingClientRect();
      // The hardcoded repeat(4, 1fr) this replaced would have squeezed or
      // wrapped the fifth tab, and would break again with a sixth.
      expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
    expectNoOverflow('six-tab nav');
  });
});
