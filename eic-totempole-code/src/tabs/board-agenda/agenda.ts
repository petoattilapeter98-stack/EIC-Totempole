import type { AgendaSession } from './agenda.static';

export type SessionStatus = 'past' | 'live' | 'upcoming';

/** Minutes since local midnight for an "HH:MM" string. */
export function toMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = Number(parts[1] ?? 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

/**
 * Where a session sits relative to the current wall-clock time.
 *
 * Compared as time-of-day rather than against a date, so the schedule stays
 * meaningful on a kiosk that runs for days without a reload - a hardcoded date
 * would make every session read as "past" from the second midnight onward.
 *
 * Boundaries: a session is live from its start minute up to (but not
 * including) its end minute, so back-to-back sessions never both read as live.
 */
export function sessionStatus(session: AgendaSession, now: Date): SessionStatus {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(session.start);
  const end = toMinutes(session.end);

  if (nowMinutes >= end) return 'past';
  if (nowMinutes >= start) return 'live';
  return 'upcoming';
}

/**
 * The first session that has not started yet - what "Up next" points at.
 *
 * Deliberately excludes a currently-live session: while one is running it is
 * already marked "Now", so "Up next" must mean the one after it. Matching on
 * "not past" instead would make the live session its own next, and the badge
 * would never appear.
 */
export function upNextSessionId(
  sessions: readonly AgendaSession[],
  now: Date,
): string | null {
  const upcoming = sessions.find((session) => sessionStatus(session, now) === 'upcoming');
  return upcoming?.id ?? null;
}
