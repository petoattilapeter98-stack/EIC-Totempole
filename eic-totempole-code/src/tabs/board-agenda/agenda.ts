import type { AgendaSession } from './agenda.static';

export type SessionStatus = 'past' | 'live' | 'upcoming';

/**
 * Where the day as a whole sits relative to the clock.
 *
 * Separate from `SessionStatus` because it answers a different question: not
 * "what is this row doing" but "is there anything to look at right now". A
 * lobby display that shows five dimmed rows at 08:00 and five dimmed rows at
 * 22:00 looks identical in both cases and broken in neither - the phase is what
 * lets the panel say which one it is.
 */
export type DayPhase = 'empty' | 'before' | 'during' | 'after';

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

/** Minutes since local midnight for a Date, matching `toMinutes`' basis. */
function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
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
  const nowMinutes = minutesOfDay(now);
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

/**
 * How long a session runs, in minutes.
 *
 * Clamped at 0 rather than returning a negative: an end before its start is
 * malformed data (or a session crossing midnight, which this schedule model
 * does not represent), and "0 min" is a visible oddity on screen where a
 * negative number would read as a code bug.
 */
export function durationMinutes(session: AgendaSession): number {
  return Math.max(0, toMinutes(session.end) - toMinutes(session.start));
}

/**
 * Index of the session the display should be centred on: the live one, else the
 * next one to start, else the last of the day once everything has ended.
 */
function anchorIndex(sessions: readonly AgendaSession[], now: Date): number {
  const live = sessions.findIndex((session) => sessionStatus(session, now) === 'live');
  if (live !== -1) return live;

  const next = sessions.findIndex((session) => sessionStatus(session, now) === 'upcoming');
  if (next !== -1) return next;

  return sessions.length - 1;
}

/**
 * The window of sessions to render, capped at `max`.
 *
 * WHY THIS IS NOT `sessions.slice(0, max)`: taking the first N pins the display
 * to the START of the day forever. With an agenda longer than the cap, a
 * visitor at 16:00 would be shown five sessions that all finished hours ago,
 * while the one actually running is off the bottom of a list that cannot
 * scroll (Constitution II) - silently invisible content, the exact failure mode
 * the no-scroll rule exists to prevent.
 *
 * Anchoring on the live/next session instead means the clock pages the list
 * forward on its own, with no scroll affordance and no operator.
 *
 * One session of context is kept above the anchor where there is room: it makes
 * the forward step legible as a schedule moving rather than a screen redrawing,
 * and it keeps "what just finished" answerable for the visitor who walked up
 * thirty seconds late.
 */
export function visibleSessions(
  sessions: readonly AgendaSession[],
  now: Date,
  max: number,
): readonly AgendaSession[] {
  if (max <= 0) return [];
  if (sessions.length <= max) return sessions;

  const anchor = anchorIndex(sessions, now);
  const start = Math.min(Math.max(anchor - 1, 0), sessions.length - max);

  return sessions.slice(start, start + max);
}

/**
 * Whether the configured day has not started, is running, or is over.
 *
 * Computed from the FULL session list, never the visible window: the window
 * moves with the clock, so asking it whether the day is over would report
 * "after" as soon as the last windowed row ended, hours early.
 *
 * Boundaries are min-of-starts and max-of-ends rather than first/last element,
 * so an out-of-order entry in hand-authored data degrades to the right answer
 * instead of an arbitrary one.
 */
export function dayPhase(sessions: readonly AgendaSession[], now: Date): DayPhase {
  if (sessions.length === 0) return 'empty';

  const nowMinutes = minutesOfDay(now);
  const firstStart = Math.min(...sessions.map((session) => toMinutes(session.start)));
  const lastEnd = Math.max(...sessions.map((session) => toMinutes(session.end)));

  if (nowMinutes < firstStart) return 'before';
  if (nowMinutes >= lastEnd) return 'after';
  return 'during';
}

/** The day's first start time, as the "HH:MM" string it was authored as. */
export function firstStartTime(sessions: readonly AgendaSession[]): string | null {
  if (sessions.length === 0) return null;

  return sessions.reduce((earliest, session) =>
    toMinutes(session.start) < toMinutes(earliest.start) ? session : earliest,
  ).start;
}
