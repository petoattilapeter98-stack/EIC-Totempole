import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMapActivity } from './useMapActivity';

/**
 * The bridge that stops the kiosk resetting a visitor mid-pan.
 *
 * jsdom has no real iframe focus model, so `document.activeElement` is stubbed
 * here. That is a deliberate limitation of these tests: they prove the ceiling,
 * the cleanup and the signalling contract, but NOT that a real browser moves
 * focus to a cross-origin frame on touch. That half is verified by hand —
 * quickstart.md §2.5, pan continuously for 90 seconds.
 */
function stubActiveElement(el: Element | null) {
  vi.spyOn(document, 'activeElement', 'get').mockReturnValue(el);
}

let frame: HTMLIFrameElement;

beforeEach(() => {
  vi.useFakeTimers();
  frame = document.createElement('iframe');
  document.body.appendChild(frame);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  frame.remove();
});

describe('useMapActivity', () => {
  it('signals activity while the map frame holds focus (FR-012)', () => {
    const onActivity = vi.fn();
    stubActiveElement(frame);

    renderHook(() =>
      useMapActivity({ frameRef: { current: frame }, onActivity, pollMs: 1000 }),
    );

    vi.advanceTimersByTime(3000);

    // Without this, panning the map for 60s resets the kiosk underneath the
    // visitor — pointer events inside a cross-origin frame never reach us.
    expect(onActivity).toHaveBeenCalledTimes(3);
  });

  it('stays silent when focus is elsewhere', () => {
    const onActivity = vi.fn();
    stubActiveElement(document.body);

    renderHook(() =>
      useMapActivity({ frameRef: { current: frame }, onActivity, pollMs: 1000 }),
    );

    vi.advanceTimersByTime(5000);

    expect(onActivity).not.toHaveBeenCalled();
  });

  it('stops extending at the ceiling even while focus persists (FR-036)', () => {
    const onActivity = vi.fn();
    stubActiveElement(frame);

    renderHook(() =>
      useMapActivity({
        frameRef: { current: frame },
        onActivity,
        ceilingSeconds: 5,
        pollMs: 1000,
      }),
    );

    vi.advanceTimersByTime(5000);
    const atCeiling = onActivity.mock.calls.length;

    vi.advanceTimersByTime(10_000);

    // THE POINT OF THIS TEST: focus does not reliably clear when a visitor
    // walks away. Uncapped, the kiosk would never idle-reset and would hold one
    // visitor's map view for days with nobody present to notice.
    expect(onActivity.mock.calls.length).toBe(atCeiling);
  });

  it('clears its interval on unmount (Constitution V)', () => {
    const onActivity = vi.fn();
    stubActiveElement(frame);

    const { unmount } = renderHook(() =>
      useMapActivity({ frameRef: { current: frame }, onActivity, pollMs: 1000 }),
    );

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10_000);
    expect(onActivity).not.toHaveBeenCalled();
  });

  it('accumulates nothing across repeated mount/unmount cycles (SC-008)', () => {
    const onActivity = vi.fn();
    stubActiveElement(frame);

    for (let i = 0; i < 5; i += 1) {
      const { unmount } = renderHook(() =>
        useMapActivity({ frameRef: { current: frame }, onActivity, pollMs: 1000 }),
      );
      unmount();
    }

    // Five entries into the map tab must not leave five stacked intervals.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not re-create its interval when the callback identity changes', () => {
    stubActiveElement(frame);
    const frameRef = { current: frame };

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) =>
        useMapActivity({ frameRef, onActivity: cb, pollMs: 1000 }),
      { initialProps: { cb: vi.fn() } },
    );

    // A caller passing an inline arrow re-renders with a new identity every
    // time; if that tore down and rebuilt the interval, the poll would never
    // fire and the bridge would silently do nothing.
    rerender({ cb: vi.fn() });
    rerender({ cb: vi.fn() });

    expect(vi.getTimerCount()).toBe(1);
  });

  it('tolerates a frame ref that is not attached yet', () => {
    const onActivity = vi.fn();
    stubActiveElement(null);

    renderHook(() =>
      useMapActivity({ frameRef: { current: null }, onActivity, pollMs: 1000 }),
    );

    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
    expect(onActivity).not.toHaveBeenCalled();
  });
});
