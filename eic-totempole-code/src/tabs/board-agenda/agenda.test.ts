import { describe, expect, it } from 'vitest';

import { agenda, MAX_VISIBLE_SESSIONS } from './agenda.static';
import { sessionStatus, toMinutes, upNextSessionId } from './agenda';
import type { AgendaSession } from './agenda.static';

const session = (start: string, end: string): AgendaSession => ({
  id: `${start}-${end}`,
  start,
  end,
  title: { en: 'Test', hu: 'Teszt' },
  presenter: { en: 'Someone', hu: 'Valaki' },
  room: { en: 'Room', hu: 'Terem' },
  accent: 'violet',
});

/** A Date at a given local wall-clock time. */
const at = (hhmm: string): Date => {
  const d = new Date(2026, 8, 4);
  d.setHours(Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)), 0, 0);
  return d;
};

describe('toMinutes', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['13:45', 825],
    ['23:59', 1439],
  ])('%s -> %i', (input, expected) => {
    expect(toMinutes(input)).toBe(expected);
  });

  it('degrades to 0 rather than NaN on malformed input', () => {
    expect(toMinutes('not-a-time')).toBe(0);
    expect(toMinutes('')).toBe(0);
  });
});

describe('sessionStatus', () => {
  const s = session('13:00', '14:15');

  it('is upcoming before the start', () => {
    expect(sessionStatus(s, at('12:59'))).toBe('upcoming');
  });

  it('is live exactly at the start minute', () => {
    expect(sessionStatus(s, at('13:00'))).toBe('live');
  });

  it('is live during', () => {
    expect(sessionStatus(s, at('13:30'))).toBe('live');
  });

  it('is live in the final minute', () => {
    expect(sessionStatus(s, at('14:14'))).toBe('live');
  });

  it('is past exactly at the end minute', () => {
    // Half-open interval: back-to-back sessions must never both read as live.
    expect(sessionStatus(s, at('14:15'))).toBe('past');
  });

  it('is past after the end', () => {
    expect(sessionStatus(s, at('16:00'))).toBe('past');
  });

  it('never marks two back-to-back sessions live at once', () => {
    const first = session('10:00', '11:00');
    const second = session('11:00', '12:00');

    const statuses = [first, second].map((x) => sessionStatus(x, at('11:00')));

    expect(statuses.filter((x) => x === 'live')).toHaveLength(1);
    expect(statuses).toEqual(['past', 'live']);
  });
});

describe('upNextSessionId', () => {
  const sessions = [
    session('09:00', '10:00'),
    session('11:00', '12:00'),
    session('14:00', '15:00'),
  ];

  it('skips the live session and points at the one after it', () => {
    // The live session is already badged "Now"; "Up next" must mean the next
    // one, otherwise the badge never renders at all.
    expect(upNextSessionId(sessions, at('11:30'))).toBe('14:00-15:00');
  });

  it('returns the first upcoming session in a gap', () => {
    expect(upNextSessionId(sessions, at('10:30'))).toBe('11:00-12:00');
  });

  it('returns the first session before the day starts', () => {
    expect(upNextSessionId(sessions, at('08:00'))).toBe('09:00-10:00');
  });

  it('returns null during the final session', () => {
    expect(upNextSessionId(sessions, at('14:30'))).toBeNull();
  });

  it('returns null once everything has ended', () => {
    expect(upNextSessionId(sessions, at('18:00'))).toBeNull();
  });

  it('returns null for an empty schedule', () => {
    expect(upNextSessionId([], at('12:00'))).toBeNull();
  });
});

describe('agenda data', () => {
  it('fits the no-scroll budget', () => {
    // Guards Constitution II: more rows than this would squash past legibility.
    expect(agenda.sessions.length).toBeLessThanOrEqual(MAX_VISIBLE_SESSIONS);
  });

  it('has unique session ids', () => {
    const ids = agenda.sessions.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is chronologically ordered and non-overlapping', () => {
    const sorted = [...agenda.sessions];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      expect(toMinutes(curr.start)).toBeGreaterThanOrEqual(toMinutes(prev.end));
    }
  });

  it('has every session ending after it starts', () => {
    for (const x of agenda.sessions) {
      expect(toMinutes(x.end)).toBeGreaterThan(toMinutes(x.start));
    }
  });

  it('has non-empty copy in both locales', () => {
    for (const x of agenda.sessions) {
      for (const locale of ['en', 'hu'] as const) {
        expect(x.title[locale].trim()).toBeTruthy();
        expect(x.presenter[locale].trim()).toBeTruthy();
        expect(x.room[locale].trim()).toBeTruthy();
      }
    }
  });
});
