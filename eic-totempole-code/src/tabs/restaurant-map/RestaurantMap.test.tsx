import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { LanguageToggle } from '../../components/LanguageToggle/LanguageToggle';
import { RESTAURANTS } from './restaurants.static';
import { STRINGS } from './strings';
import RestaurantMap from './RestaurantMap';

function renderMap() {
  return render(
    <KioskProvider>
      <RestaurantMap />
    </KioskProvider>,
  );
}

/**
 * The frame reports a successful load, winning the 5s race.
 *
 * `fireEvent.load`, not a raw dispatchEvent: `load` does not bubble, so React's
 * root-level delegation never sees a manually dispatched one.
 */
function fireFrameLoad() {
  const frame = document.querySelector('iframe');
  if (frame) fireEvent.load(frame);
}

beforeEach(() => {
  // jsdom leaves navigator.onLine true by default; be explicit so the offline
  // fast path is only exercised where a test asks for it.
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// User Story 1 — the default state
// ---------------------------------------------------------------------------

describe('RestaurantMap default state (US1)', () => {
  it('names every curated restaurant with zero taps (FR-006, SC-014)', () => {
    renderMap();

    for (const restaurant of RESTAURANTS) {
      expect(screen.getByText(restaurant.name)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(RESTAURANTS.length);
  });

  it('pairs each name with its pin number (FR-006)', () => {
    renderMap();

    const rows = screen.getAllByRole('listitem');
    RESTAURANTS.forEach((restaurant, index) => {
      const row = rows[index];
      // The number is the entire link between a list row and its map pin.
      expect(row).toHaveTextContent(String(restaurant.number));
      expect(row).toHaveTextContent(restaurant.name);
    });
  });

  it('shows walking time on every row (FR-038)', () => {
    renderMap();

    const rows = screen.getAllByRole('listitem');
    RESTAURANTS.forEach((restaurant, index) => {
      expect(rows[index]).toHaveTextContent(String(restaurant.walkMinutes));
    });
  });

  it('omits addresses while the map is working, to keep rows single-line (FR-038)', () => {
    renderMap();
    expect(screen.queryByText(RESTAURANTS[0]!.address.en)).not.toBeInTheDocument();
  });

  it('renders the map frame with the sandbox that keeps the kiosk captive (FR-008)', () => {
    renderMap();

    const frame = document.querySelector('iframe');
    expect(frame).not.toBeNull();
    // Regression guard: this exact value is a security boundary. Adding
    // allow-popups or allow-top-navigation would let the embed navigate the
    // kiosk away with no way back.
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('gives the map frame a localized accessible name (FR-019)', () => {
    renderMap();
    expect(document.querySelector('iframe')?.getAttribute('title')).toBe(
      STRINGS.mapFrameTitle.en,
    );
  });

  it('switches feature copy to Hungarian but leaves proper names alone (FR-018)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <LanguageToggle />
        <RestaurantMap />
      </KioskProvider>,
    );

    expect(screen.getByText(STRINGS.listSubheading.en)).toBeInTheDocument();

    // Driven through the real shell toggle, so this exercises the same path a
    // visitor takes rather than a locale prop the app never sets directly.
    await user.click(screen.getByRole('button', { name: /magyar|hungarian|hu/i }));

    expect(screen.getByText(STRINGS.listSubheading.hu)).toBeInTheDocument();
    expect(screen.queryByText(STRINGS.listSubheading.en)).not.toBeInTheDocument();

    // Proper names are exempt from translation and must survive any locale.
    for (const restaurant of RESTAURANTS) {
      expect(screen.getByText(restaurant.name)).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// User Story 2 — display states and focus
// ---------------------------------------------------------------------------

describe('RestaurantMap display states (US2)', () => {
  it('starts collapsed on every mount (FR-011, contract S1)', () => {
    const { unmount } = renderMap();
    expect(screen.getByRole('button', { name: STRINGS.expandLabel.en })).toBeInTheDocument();

    unmount();
    renderMap();
    // No expansion is inherited from the previous visitor.
    expect(screen.getByRole('button', { name: STRINGS.expandLabel.en })).toBeInTheDocument();
  });

  it('hides the companion list when expanded (FR-029)', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    expect(screen.queryByText(STRINGS.listSubheading.en)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('restores the list on collapse (FR-024, FR-026)', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    await user.click(screen.getByRole('button', { name: STRINGS.collapseLabel.en }));

    expect(screen.getAllByRole('listitem')).toHaveLength(RESTAURANTS.length);
  });

  it('moves focus to the return control on expand, and back on collapse (contract S6)', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    // Without this, a keyboard user is stranded behind the now-covered nav.
    expect(screen.getByRole('button', { name: STRINGS.collapseLabel.en })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: STRINGS.collapseLabel.en }));
    expect(screen.getByRole('button', { name: STRINGS.expandLabel.en })).toHaveFocus();
  });

  it('does not trap focus while expanded (contract S7)', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));
    await user.tab();

    // A trap would make the expanded state a modal in all but name, which
    // Constitution IV forbids.
    expect(screen.getByRole('button', { name: STRINGS.collapseLabel.en })).not.toHaveFocus();
  });

  it('announces no dialog semantics (Constitution IV, contract S2)', async () => {
    const user = userEvent.setup();
    renderMap();

    await user.click(screen.getByRole('button', { name: STRINGS.expandLabel.en }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// User Story 3 — load race and fallback
// ---------------------------------------------------------------------------

describe('RestaurantMap load race and fallback (US3)', () => {
  it('shows a bounded loading state, not an empty region (FR-014)', () => {
    renderMap();
    expect(screen.getByText(STRINGS.loading.en)).toBeInTheDocument();
  });

  it('clears the loading state when the frame loads (FR-013)', () => {
    renderMap();
    fireFrameLoad();
    expect(screen.queryByText(STRINGS.loading.en)).not.toBeInTheDocument();
  });

  it('falls back once the 5s deadline passes (FR-013, SC-005)', () => {
    vi.useFakeTimers();
    renderMap();

    // Timer-driven setState must be flushed through act() or React never
    // re-renders and the assertion reads a stale DOM.
    act(() => vi.advanceTimersByTime(5000));

    expect(screen.getByText(STRINGS.fallbackHeading.en)).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('does not list the restaurants twice in the default-state fallback', () => {
    vi.useFakeTimers();
    renderMap();

    act(() => vi.advanceTimersByTime(5000));

    // The companion list is already on screen; repeating it inside the map area
    // would show every restaurant twice.
    expect(screen.getAllByRole('listitem')).toHaveLength(RESTAURANTS.length);
  });

  it('lists name AND address for every restaurant in the fallback (FR-013)', () => {
    vi.useFakeTimers();
    renderMap();

    act(() => vi.advanceTimersByTime(5000));

    for (const restaurant of RESTAURANTS) {
      expect(screen.getByText(restaurant.name)).toBeInTheDocument();
      expect(screen.getByText(restaurant.address.en)).toBeInTheDocument();
    }
  });

  it('fails immediately when the kiosk is offline, without waiting out the timeout', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderMap();

    expect(screen.getByText(STRINGS.fallbackHeading.en)).toBeInTheDocument();
  });

  it('does not fall back when the frame loads before the deadline', () => {
    vi.useFakeTimers();
    renderMap();

    fireFrameLoad();
    act(() => vi.advanceTimersByTime(10_000));

    // The timeout must have been cleared, not merely outrun.
    expect(screen.queryByText(STRINGS.fallbackHeading.en)).not.toBeInTheDocument();
  });

  it('leaves no pending timer behind on unmount (Constitution V)', () => {
    vi.useFakeTimers();
    const { unmount } = renderMap();

    unmount();

    // A surviving timeout would call setState on an unmounted component every
    // time the kiosk visits this tab — the kind of leak that only shows up
    // after days of unattended runtime.
    expect(vi.getTimerCount()).toBe(0);
  });
});
