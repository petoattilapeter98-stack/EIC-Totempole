import { useCallback, useEffect, useRef, useState } from 'react';

/** Full countdown duration. Tunable — spec Assumption, matches the reference mockup. */
export const IDLE_TIMEOUT_SECONDS = 60;

/**
 * Tick faster than 1s so the displayed second flips crisply at the boundary,
 * but only call setState when the whole second actually changes — otherwise an
 * always-on display would re-render four times a second, forever.
 */
export const TICK_MS = 250;

export interface UseIdleResetOptions {
  readonly durationSeconds?: number;
  readonly onExpire: () => void;
}

export interface IdleResetState {
  readonly remainingSeconds: number;
  /** Manual reset, exposed for tests and for future programmatic use. */
  readonly reset: () => void;
}

/**
 * Idle auto-reset countdown (spec FR-017, FR-018, FR-019).
 *
 * Design notes — each clause prevents a specific known failure:
 *
 *  - The countdown derives from an ABSOLUTE deadline timestamp, not a
 *    decrementing counter. A late or coalesced tick self-corrects instead of
 *    accumulating error, including across OS sleep/resume. (The reference
 *    mockup decrements a counter and silently under-counts.)
 *
 *  - Interaction handlers rewrite a REF, never call setState directly, so a
 *    touch never triggers a re-render or re-subscribes the effect.
 *
 *  - `onExpire` is held in a ref and kept OUT of the effect dependency array.
 *    Without this, a caller passing an inline arrow would tear down and
 *    re-create the interval on every render — the classic leak this whole
 *    contract exists to prevent (Constitution V).
 *
 *  - The interval and BOTH document listeners are removed in the same cleanup.
 */
export function useIdleReset({
  durationSeconds = IDLE_TIMEOUT_SECONDS,
  onExpire,
}: UseIdleResetOptions): IdleResetState {
  const durationMs = durationSeconds * 1000;

  const deadlineRef = useRef<number>(Date.now() + durationMs);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  // Keep the latest callback without making the effect depend on its identity.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const reset = useCallback(() => {
    deadlineRef.current = Date.now() + durationMs;
  }, [durationMs]);

  useEffect(() => {
    // A duration change restarts the cycle rather than leaving a stale deadline.
    deadlineRef.current = Date.now() + durationMs;
    setRemainingSeconds(durationSeconds);

    const handleInteraction = () => {
      deadlineRef.current = Date.now() + durationMs;
    };

    const id = setInterval(() => {
      const msLeft = deadlineRef.current - Date.now();

      if (msLeft <= 0) {
        // Restart the cycle BEFORE firing, so a throwing callback cannot
        // leave the kiosk with an expired deadline firing every tick.
        deadlineRef.current = Date.now() + durationMs;
        setRemainingSeconds(durationSeconds);
        onExpireRef.current();
        return;
      }

      const next = Math.max(0, Math.ceil(msLeft / 1000));
      // Only re-render when the displayed integer actually changes.
      setRemainingSeconds((prev) => (prev === next ? prev : next));
    }, TICK_MS);

    document.addEventListener('pointerdown', handleInteraction, { passive: true });
    document.addEventListener('keydown', handleInteraction);

    return () => {
      clearInterval(id);
      document.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [durationMs, durationSeconds]);

  return { remainingSeconds, reset };
}
