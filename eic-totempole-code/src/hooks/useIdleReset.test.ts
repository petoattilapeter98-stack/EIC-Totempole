import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdleReset } from './useIdleReset';

const DURATION = 60;

describe('useIdleReset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down from the full duration', () => {
    const { result } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );

    expect(result.current.remainingSeconds).toBe(DURATION);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.remainingSeconds).toBe(DURATION - 5);
  });

  it('resets the countdown on pointerdown anywhere on the document', () => {
    const { result } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.remainingSeconds).toBe(30);

    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.remainingSeconds).toBe(DURATION);
  });

  it('resets the countdown on keydown anywhere on the document', () => {
    const { result } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );

    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    expect(result.current.remainingSeconds).toBe(20);

    act(() => {
      document.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(250);
    });

    expect(result.current.remainingSeconds).toBe(DURATION);
  });

  it('fires onExpire exactly once when the countdown reaches zero', () => {
    const onExpire = vi.fn();
    renderHook(() => useIdleReset({ durationSeconds: DURATION, onExpire }));

    act(() => {
      vi.advanceTimersByTime(DURATION * 1000 + 250);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('restarts a full cycle after expiring', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire }),
    );

    act(() => {
      vi.advanceTimersByTime(DURATION * 1000 + 250);
    });
    expect(result.current.remainingSeconds).toBe(DURATION);

    act(() => {
      vi.advanceTimersByTime(DURATION * 1000 + 250);
    });
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it('never reports a negative remaining value', () => {
    const { result } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );

    for (let i = 0; i < 500; i += 1) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(0);
      expect(result.current.remainingSeconds).toBeLessThanOrEqual(DURATION);
    }
  });

  it('leaves no timer running after unmount', () => {
    const { unmount } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes every document listener it added', () => {
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useIdleReset({ durationSeconds: DURATION, onExpire: vi.fn() }),
    );

    const addedPairs = added.mock.calls
      .filter(([type]) => type === 'pointerdown' || type === 'keydown')
      .map(([type, handler]) => `${type}:${String(handler)}`);

    unmount();

    const removedPairs = removed.mock.calls
      .filter(([type]) => type === 'pointerdown' || type === 'keydown')
      .map(([type, handler]) => `${type}:${String(handler)}`);

    expect(addedPairs.length).toBeGreaterThan(0);
    // Every listener added is removed with the same type AND the same reference.
    expect(removedPairs.sort()).toEqual(addedPairs.sort());

    added.mockRestore();
    removed.mockRestore();
  });

  it('does not re-subscribe when the onExpire identity changes', () => {
    const { rerender, result } = renderHook(
      ({ cb }: { cb: () => void }) =>
        useIdleReset({ durationSeconds: DURATION, onExpire: cb }),
      { initialProps: { cb: vi.fn() } },
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    const timersBefore = vi.getTimerCount();
    expect(result.current.remainingSeconds).toBe(50);

    // A caller passing a fresh inline arrow every render must not tear down and
    // re-create the interval — the classic leak this hook is designed against.
    rerender({ cb: vi.fn() });

    expect(vi.getTimerCount()).toBe(timersBefore);
    expect(result.current.remainingSeconds).toBe(50);
  });

  it('calls the latest onExpire, not a stale one', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) =>
        useIdleReset({ durationSeconds: DURATION, onExpire: cb }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });

    act(() => {
      vi.advanceTimersByTime(DURATION * 1000 + 250);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
