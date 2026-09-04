import { useEffect, useState } from 'react';

export interface ClockReading {
  readonly now: Date;
}

const TICK_MS = 1000;

/**
 * Current wall-clock time, updated once per second (spec FR-002, FR-003).
 *
 * Each tick reads `new Date()` FRESH — the value is never derived by adding to
 * the previous one. `setInterval` fires late under CPU pressure, background
 * throttling or OS sleep/resume; re-reading the clock means a late tick still
 * shows the correct time. Drift affects *when* the number changes, never *what
 * it says*, which is what makes SC-002 hold across a 72-hour run.
 *
 * The interval is cleared in the effect cleanup (Constitution V). StrictMode's
 * development double-mount is therefore a free leak detector, not a problem.
 */
export function useClock(): ClockReading {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, TICK_MS);

    return () => {
      clearInterval(id);
    };
  }, []);

  return { now };
}
