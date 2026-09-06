import { useEffect, useState } from 'react';

/** The one design viewport the kiosk is built for (Constitution I). */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1280;

/**
 * Preview mode engages only well BELOW the design size.
 *
 * This threshold is deliberately generous rather than `< 1920 x 1280`: the Hub
 * must never letterbox in production, and a browser reporting slightly less
 * than the design height (window chrome, a changed OS scaling setting) would
 * otherwise silently flip the real kiosk into a scaled preview. Anything at or
 * above this is treated as the kiosk and rendered completely untouched.
 */
export const PREVIEW_MAX_WIDTH = 1600;
export const PREVIEW_MAX_HEIGHT = 1000;

/**
 * Scale factor that fits the fixed 1920x1280 design into the current viewport,
 * or `null` when this is a kiosk-sized screen and no scaling should happen.
 */
export function computePreviewScale(width: number, height: number): number | null {
  if (width > PREVIEW_MAX_WIDTH && height > PREVIEW_MAX_HEIGHT) {
    return null;
  }
  // Fit-inside: the smaller ratio wins, so the full frame is always visible
  // and the aspect ratio is preserved (letterboxed rather than cropped).
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

function currentScale(): number | null {
  if (typeof window === 'undefined') return null;
  return computePreviewScale(window.innerWidth, window.innerHeight);
}

/**
 * Drives the validation-only preview frame.
 *
 * Purpose is fidelity, not responsiveness: on a phone you want to see exactly
 * what the Hub renders, scaled down - not a different layout that production
 * never shows. Returns null on kiosk-sized viewports so the real kiosk path is
 * completely unaffected.
 *
 * Listeners are removed on unmount (Constitution V).
 */
export function usePreviewScale(): number | null {
  const [scale, setScale] = useState<number | null>(currentScale);

  useEffect(() => {
    const update = () => setScale(currentScale());

    // Re-read once on mount: the first render may have happened before the
    // browser settled its final viewport (mobile toolbars, rotation).
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return scale;
}
