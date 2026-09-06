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

  /**
   * Whole seconds since the last real interaction.
   *
   * Unlike remainingSeconds this is MONOTONIC: it keeps climbing past an
   * expiry and is only cleared by an actual pointerdown/keydown. The
   * auto-reset firing is not a person touching the kiosk, so anything driven
   * by "how long has nobody been here" (attract mode) must use this rather
   * than the countdown, which restarts on its own.
   */
  readonly idleSeconds: number;

  /**
   * Whether anyone has touched the kiosk since it loaded.
   *
   * False from boot until the first real pointerdown/keydown. Lets the shell
   * come up already in its ambient state rather than showing crisp UI to an
   * empty lobby for the first idle period - on a display that may be power
   * cycled or reloaded at any hour, "nobody has ever been here" is the honest
   * starting condition.
   */
  readonly hasInteracted: boolean;

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

  // Separate from the deadline on purpose: the deadline restarts itself on
  // expiry so the footer keeps counting, but idle time must keep accumulating
  // until a person actually touches the screen.
  const lastInteractionRef = useRef<number>(Date.now());
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Keep the latest callback without making the effect depend on its identity.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const reset = useCallback(() => {
    const now = Date.now();
    deadlineRef.current = now + durationMs;
    lastInteractionRef.current = now;
  }, [durationMs]);

  useEffect(() => {
    // A duration change restarts the cycle rather than leaving a stale deadline.
    const start = Date.now();
    deadlineRef.current = start + durationMs;
    lastInteractionRef.current = start;
    setRemainingSeconds(durationSeconds);
    setIdleSeconds(0);

    const handleInteraction = () => {
      const now = Date.now();
      deadlineRef.current = now + durationMs;
      lastInteractionRef.current = now;
      // Latches on the first touch and stays true; setState bails out on an
      // unchanged value, so this costs nothing on every subsequent touch.
      setHasInteracted(true);
    };

    const id = setInterval(() => {
      const now = Date.now();

      // Monotonic idle clock, unaffected by the expiry below.
      const idle = Math.max(0, Math.floor((now - lastInteractionRef.current) / 1000));
      setIdleSeconds((prev) => (prev === idle ? prev : idle));

      const msLeft = deadlineRef.current - now;

      if (msLeft <= 0) {
        // Restart the cycle BEFORE firing, so a throwing callback cannot
        // leave the kiosk with an expired deadline firing every tick.
        // NOTE: lastInteractionRef is deliberately NOT touched here - an
        // auto-reset is not a person, and attract mode must keep counting.
        deadlineRef.current = now + durationMs;
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

  return { remainingSeconds, idleSeconds, hasInteracted, reset };
}
