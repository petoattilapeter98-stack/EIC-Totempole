import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClock } from './useClock';

describe('useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances once per second', () => {
    vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));
    const { result } = renderHook(() => useClock());

    const first = result.current.now.getTime();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.now.getTime()).toBe(first + 1000);
  });

  it('reads the wall clock fresh, so a late tick still shows the correct time', () => {
    vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));
    const { result } = renderHook(() => useClock());

    // Simulate a stalled/coalesced interval: 5 seconds of real time pass but
    // only one tick fires. A decrementing implementation would drift; reading
    // Date fresh means the displayed value is still correct (SC-002).
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.now.toISOString()).toBe('2026-09-04T10:00:05.000Z');
  });

  it('leaves no timer running after unmount', () => {
    const { unmount } = renderHook(() => useClock());
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
