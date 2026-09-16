import { useEffect, useRef, type RefObject } from 'react';

import { MAP_FOCUS_POLL_MS, MAX_MAP_SESSION_SECONDS } from './restaurants.static';

interface UseMapActivityOptions {
  /** The embedded map frame to watch for focus. */
  readonly frameRef: RefObject<HTMLIFrameElement | null>;
  /** Public activity signal from useKiosk() — never the idle hook's internals. */
  readonly onActivity: () => void;
  /** Overridable so tests need not wait ten real minutes. */
  readonly ceilingSeconds?: number;
  readonly pollMs?: number;
}

/**
 * Bridges interaction inside the map frame to the kiosk's idle timer.
 *
 * WHY THIS EXISTS
 * ---------------
 * `useIdleReset` listens for pointerdown/keydown on `document`. Events inside a
 * CROSS-ORIGIN iframe never reach the parent document — they are delivered to
 * the frame's own document. Without this bridge:
 *
 *   a visitor pans and zooms the map for 60 seconds, touching nothing outside
 *   the frame, and the kiosk resets to Board Agenda underneath them.
 *
 * That is spec FR-012 failing, and failing SILENTLY: it would pass every jsdom
 * test, because jsdom has no real iframe focus model.
 *
 * HOW
 * ---
 * Focus is the one signal that crosses the origin boundary. Touching inside a
 * frame moves focus to the iframe element, so `document.activeElement === frame`
 * means "the visitor is working in the map" without any access to its contents.
 *
 * THE CEILING IS NOT DEFENSIVE PADDING
 * ------------------------------------
 * Focus does NOT reliably clear when someone walks away. Uncapped, "the frame
 * is focused" would count as activity forever and the kiosk would never
 * idle-reset — it would hold one visitor's map view for days with no operator
 * to notice, which is precisely the unattended decay Constitution V exists to
 * prevent. The ceiling (spec FR-036, 10 minutes) converts an unbounded stall
 * into a bounded one.
 *
 * If you are tempted to delete the ceiling because it looks redundant: it is
 * the entire reason this mechanism is constitutionally acceptable.
 *
 * Contract: specs/003-restaurant-map/contracts/view-states.md §2
 */
export function useMapActivity({
  frameRef,
  onActivity,
  ceilingSeconds = MAX_MAP_SESSION_SECONDS,
  pollMs = MAP_FOCUS_POLL_MS,
}: UseMapActivityOptions): void {
  // Held in a ref and kept OUT of the effect deps: a caller passing an inline
  // arrow would otherwise tear down and re-create the interval on every render
  // — the exact leak Constitution V's lifecycle rule targets. Same pattern as
  // useIdleReset's onExpire.
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  });

  useEffect(() => {
    const mountedAt = Date.now();

    const id = setInterval(() => {
      const frame = frameRef.current;
      if (!frame) return;

      const elapsedSeconds = (Date.now() - mountedAt) / 1000;
      if (elapsedSeconds >= ceilingSeconds) {
        // Past the ceiling we stop extending and let the kiosk reclaim itself,
        // no matter what focus says.
        return;
      }

      if (document.activeElement === frame) {
        onActivityRef.current();
      }
    }, pollMs);

    // One interval per mount, cleared on unmount. There is no second timer and
    // nothing accumulates across mount/unmount cycles.
    return () => clearInterval(id);
  }, [frameRef, ceilingSeconds, pollMs]);
}
