import { useEffect, useRef, type RefObject } from 'react';

export interface UseIframeIdleKeepaliveOptions {
  /** Ref to the agent iframe/container element currently mounted, or null when inactive. */
  readonly targetRef: RefObject<HTMLElement | null>;
  /** The shell's existing reset function from useIdleReset (spec 001). */
  readonly reset: () => void;
  /** How often to call reset() while focus remains inside the target. */
  readonly keepaliveIntervalMs?: number;
}

const DEFAULT_KEEPALIVE_MS = 5000;

/**
 * Bridges useIdleReset (spec 001) across the agent iframe boundary (spec FR-011,
 * research.md R5, contracts/idle-keepalive-contract.md).
 *
 * useIdleReset's own document-level pointerdown/keydown listeners cannot see
 * events *inside* a cross-origin iframe's own document -- that's a different
 * document entirely. What *is* observable from the parent is the focus
 * transfer itself: when a visitor interacts with the iframe's content, the
 * iframe element becomes `document.activeElement` in the PARENT document, and
 * Chromium (the kiosk's only target browser, per Constitution I / plan.md
 * Target Platform) fires a normal bubbling `focusin` for that transfer. That
 * lets this hook stay a plain document-level listener, matching useIdleReset's
 * own pattern, rather than the cross-browser window-blur workaround older
 * engines historically needed.
 *
 * No effect while `targetRef.current` is null (the panel is idle) -- this
 * effect re-runs on every render (no dependency array) specifically so it
 * picks up the target mounting/unmounting between AgentPanel's idle <-> active
 * transitions without needing a callback ref.
 */
export function useIframeIdleKeepalive({
  targetRef,
  reset,
  keepaliveIntervalMs = DEFAULT_KEEPALIVE_MS,
}: UseIframeIdleKeepaliveOptions): void {
  // Latest reset without making the effect depend on its identity (same
  // discipline as useIdleReset's onExpireRef).
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const isFocusInTarget = () =>
      document.activeElement === target || target.contains(document.activeElement);

    const startKeepalive = () => {
      if (intervalId !== null) {
        return;
      }
      intervalId = setInterval(() => {
        resetRef.current();
      }, keepaliveIntervalMs);
    };

    const stopKeepalive = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (event.target === target || target.contains(event.target as Node | null)) {
        resetRef.current();
        startKeepalive();
      }
    };

    const handleFocusOut = () => {
      // Deferred: focusout fires before the new activeElement is committed,
      // so check on the next tick whether focus actually left the target
      // (it may have moved to another element *inside* the target instead).
      window.setTimeout(() => {
        if (!isFocusInTarget()) {
          stopKeepalive();
        }
      }, 0);
    };

    // Covers the case where the target already has focus at mount time.
    if (isFocusInTarget()) {
      startKeepalive();
    }

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      stopKeepalive();
    };
  });
}
