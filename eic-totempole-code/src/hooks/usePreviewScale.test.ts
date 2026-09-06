import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  computePreviewScale,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  usePreviewScale,
} from './usePreviewScale';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true });
};

describe('computePreviewScale', () => {
  it('returns null at the kiosk viewport so production is untouched', () => {
    expect(computePreviewScale(DESIGN_WIDTH, DESIGN_HEIGHT)).toBeNull();
  });

  it('returns null on a viewport slightly under the design size', () => {
    // The Hub reporting a little less than 1920x1280 (window chrome, a changed
    // OS scaling setting) must NOT silently letterbox the real kiosk.
    expect(computePreviewScale(1900, 1240)).toBeNull();
    expect(computePreviewScale(1700, 1100)).toBeNull();
  });

  it('scales to fit an iPhone-sized portrait viewport', () => {
    const scale = computePreviewScale(390, 844);
    // Width is the binding constraint in portrait.
    expect(scale).toBeCloseTo(390 / DESIGN_WIDTH, 5);
  });

  it('scales to fit a phone in landscape', () => {
    const scale = computePreviewScale(844, 390);
    // Height binds in landscape.
    expect(scale).toBeCloseTo(390 / DESIGN_HEIGHT, 5);
  });

  it('always fits inside, never crops', () => {
    for (const [w, h] of [
      [390, 844],
      [844, 390],
      [768, 1024],
      [1440, 900],
    ] as const) {
      const scale = computePreviewScale(w, h);
      expect(scale).not.toBeNull();
      expect(DESIGN_WIDTH * scale!).toBeLessThanOrEqual(w + 0.001);
      expect(DESIGN_HEIGHT * scale!).toBeLessThanOrEqual(h + 0.001);
    }
  });

  it('preserves the 3:2 aspect ratio - the whole point of the preview', () => {
    const scale = computePreviewScale(390, 844)!;
    const ratio = (DESIGN_WIDTH * scale) / (DESIGN_HEIGHT * scale);
    expect(ratio).toBeCloseTo(DESIGN_WIDTH / DESIGN_HEIGHT, 5);
  });
});

describe('usePreviewScale', () => {
  afterEach(() => {
    setViewport(1024, 768);
  });

  it('reports null on a kiosk-sized viewport', () => {
    setViewport(DESIGN_WIDTH, DESIGN_HEIGHT);
    const { result } = renderHook(() => usePreviewScale());
    expect(result.current).toBeNull();
  });

  it('reports a scale on a small viewport', () => {
    setViewport(390, 844);
    const { result } = renderHook(() => usePreviewScale());
    expect(result.current).toBeCloseTo(390 / DESIGN_WIDTH, 5);
  });

  it('removes every listener it added', () => {
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePreviewScale());

    const addedPairs = added.mock.calls
      .filter(([type]) => type === 'resize' || type === 'orientationchange')
      .map(([type, handler]) => `${type}:${String(handler)}`);

    unmount();

    const removedPairs = removed.mock.calls
      .filter(([type]) => type === 'resize' || type === 'orientationchange')
      .map(([type, handler]) => `${type}:${String(handler)}`);

    expect(addedPairs.length).toBeGreaterThan(0);
    expect(removedPairs.sort()).toEqual(addedPairs.sort());

    added.mockRestore();
    removed.mockRestore();
  });
});
