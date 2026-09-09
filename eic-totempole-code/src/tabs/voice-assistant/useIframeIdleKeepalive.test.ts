import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import { useIframeIdleKeepalive } from './useIframeIdleKeepalive';

describe('useIframeIdleKeepalive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('does nothing while the target ref is null', () => {
    const reset = vi.fn();
    const targetRef = createRef<HTMLElement>();

    renderHook(() => useIframeIdleKeepalive({ targetRef, reset, keepaliveIntervalMs: 1000 }));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(reset).not.toHaveBeenCalled();
  });

  it('starts calling reset() once focus enters the target, and keeps calling it on interval', () => {
    const reset = vi.fn();
    const target = document.createElement('div');
    target.tabIndex = 0;
    document.body.appendChild(target);
    const targetRef = { current: target };

    renderHook(() => useIframeIdleKeepalive({ targetRef, reset, keepaliveIntervalMs: 1000 }));

    act(() => {
      // jsdom dispatches a bubbling 'focusin' automatically as part of .focus().
      target.focus();
    });

    expect(reset).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(reset).toHaveBeenCalledTimes(4);
  });

  it('stops calling reset() once focus leaves the target', () => {
    const reset = vi.fn();
    const target = document.createElement('div');
    target.tabIndex = 0;
    const other = document.createElement('button');
    document.body.appendChild(target);
    document.body.appendChild(other);
    const targetRef = { current: target };

    renderHook(() => useIframeIdleKeepalive({ targetRef, reset, keepaliveIntervalMs: 1000 }));

    act(() => {
      // jsdom dispatches a bubbling 'focusin' automatically as part of .focus().
      target.focus();
    });
    expect(reset).toHaveBeenCalledTimes(1);

    act(() => {
      // jsdom dispatches 'focusout'/'blur' on target automatically here too.
      other.focus();
      vi.advanceTimersByTime(0);
    });

    reset.mockClear();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(reset).not.toHaveBeenCalled();
  });

  it('cleans up its interval and listeners on unmount', () => {
    const reset = vi.fn();
    const target = document.createElement('div');
    target.tabIndex = 0;
    document.body.appendChild(target);
    const targetRef = { current: target };

    const { unmount } = renderHook(() =>
      useIframeIdleKeepalive({ targetRef, reset, keepaliveIntervalMs: 1000 }),
    );

    act(() => {
      // jsdom dispatches a bubbling 'focusin' automatically as part of .focus().
      target.focus();
    });
    expect(reset).toHaveBeenCalledTimes(1);

    unmount();
    reset.mockClear();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(reset).not.toHaveBeenCalled();
  });
});
