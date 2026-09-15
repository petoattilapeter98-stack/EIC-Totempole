import { describe, expect, it } from 'vitest';

import { agenda, MAX_VISIBLE_SESSIONS } from './agenda.static';
import {
  dayPhase,
  durationMinutes,
  firstStartTime,
  sessionStatus,
  toMinutes,
  upNextSessionId,
  visibleSessions,
} from './agenda';
import { agendaStrings, formatDuration } from './strings';
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

describe('durationMinutes', () => {
  it('measures the session window', () => {
    expect(durationMinutes(session('09:00', '10:30'))).toBe(90);
    expect(durationMinutes(session('13:00', '13:45'))).toBe(45);
  });

  it('clamps a malformed backwards window to 0 rather than going negative', () => {
    expect(durationMinutes(session('15:00', '14:00'))).toBe(0);
  });
});

describe('formatDuration', () => {
  const s = agendaStrings.en;

  it.each([
    [45, '45 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [135, '2 h 15 min'],
  ])('%i minutes -> %s', (minutes, expected) => {
    expect(formatDuration(minutes, s)).toBe(expected);
  });

  it('never prints a zero part', () => {
    // "2 h 0 min" and "0 h 45 min" are the two ways this can read wrong.
    expect(formatDuration(120, s)).toBe('2 h');
    expect(formatDuration(30, s)).toBe('30 min');
  });

  it('shows 0 min rather than an empty string for a zero-length session', () => {
    expect(formatDuration(0, s)).toBe('0 min');
  });

  it('uses the locale’s units', () => {
    expect(formatDuration(90, agendaStrings.hu)).toBe('1 ó 30 perc');
  });
});

describe('visibleSessions', () => {
  // Deliberately longer than the window, which is the only case that matters:
  // a short agenda has nothing to window.
  const many = [
    session('09:00', '10:00'),
    session('10:00', '11:00'),
    session('11:00', '12:00'),
    session('13:00', '14:00'),
    session('14:00', '15:00'),
    session('15:00', '16:00'),
    session('16:00', '17:00'),
  ];

  it('returns everything when the agenda fits', () => {
    const few = many.slice(0, 3);
    expect(visibleSessions(few, at('09:30'), 5)).toEqual(few);
  });

  it('never returns more than the cap', () => {
    // The no-scroll guarantee (Constitution II) is this assertion, at every
    // hour of the day rather than at one convenient one.
    for (let hour = 0; hour < 24; hour += 1) {
      const window = visibleSessions(many, at(`${String(hour).padStart(2, '0')}:00`), 5);
      expect(window.length).toBeLessThanOrEqual(5);
    }
  });

  it('starts at the top before the day begins', () => {
    expect(visibleSessions(many, at('07:00'), 5)[0]?.id).toBe('09:00-10:00');
  });

  it('keeps the live session on screen once it has paged forward', () => {
    // The whole point: at 16:15 the first-five slice would show nothing but
    // finished sessions, with the live one off the bottom of a list that cannot
    // scroll.
    const window = visibleSessions(many, at('16:15'), 5);
    expect(window.map((x) => x.id)).toContain('16:00-17:00');
  });

  it('keeps one finished session above the live one for context', () => {
    const window = visibleSessions(many, at('13:30'), 5);
    expect(window[0]?.id).toBe('11:00-12:00');
    expect(window[1]?.id).toBe('13:00-14:00');
  });

  it('stops paging at the end of the agenda rather than running off it', () => {
    // Late in the day the anchor-1 rule would walk past the last session; the
    // window pins to the final N instead of returning a short list.
    const window = visibleSessions(many, at('14:30'), 5);
    expect(window).toHaveLength(5);
    expect(window.at(-1)?.id).toBe('16:00-17:00');
  });

  it('lands on the last window once everything has ended', () => {
    const window = visibleSessions(many, at('23:00'), 5);
    expect(window.map((x) => x.id)).toEqual(many.slice(2).map((x) => x.id));
  });

  it('handles an empty schedule and a zero cap', () => {
    expect(visibleSessions([], at('12:00'), 5)).toEqual([]);
    expect(visibleSessions(many, at('12:00'), 0)).toEqual([]);
  });
});

describe('dayPhase', () => {
  const sessions = [session('09:00', '10:00'), session('14:00', '15:00')];

  it('is before the day until the first start', () => {
    expect(dayPhase(sessions, at('08:59'))).toBe('before');
  });

  it('is during from the first start', () => {
    expect(dayPhase(sessions, at('09:00'))).toBe('during');
  });

  it('stays during across the gap between sessions', () => {
    // A lull is not the end of the day - the "ended" notice must not appear at
    // 11:00 with an afternoon session still to come.
    expect(dayPhase(sessions, at('11:00'))).toBe('during');
  });

  it('is after once the last session ends', () => {
    expect(dayPhase(sessions, at('15:00'))).toBe('after');
  });

  it('is empty for no sessions', () => {
    expect(dayPhase([], at('12:00'))).toBe('empty');
  });

  it('uses the latest end, not the last entry, if data is out of order', () => {
    const outOfOrder = [session('14:00', '18:00'), session('09:00', '10:00')];
    expect(dayPhase(outOfOrder, at('17:00'))).toBe('during');
  });
});

describe('firstStartTime', () => {
  it('returns the earliest start as authored', () => {
    expect(firstStartTime([session('14:00', '15:00'), session('09:00', '10:00')])).toBe('09:00');
  });

  it('returns null for an empty schedule', () => {
    expect(firstStartTime([])).toBeNull();
  });
});

describe('agenda data', () => {
  it('fits the no-scroll budget', () => {
    /*
     * Windowing means a longer agenda no longer loses its tail, so this is a
     * LEGIBILITY check, not a correctness one: up to the cap, every session is
     * on screen at once with no paging for a visitor to wait through. Delete it
     * only alongside a decision that the agenda is now long enough to page.
     */
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

  it('has detail copy in both locales wherever it is supplied', () => {
    // The fields are optional, so the risk is not a missing one - it is a
    // half-filled one, EN written and HU left blank, which only shows up on the
    // kiosk when somebody taps the row with the toggle on Hungarian.
    for (const x of agenda.sessions) {
      for (const locale of ['en', 'hu'] as const) {
        if (x.description) expect(x.description[locale].trim()).toBeTruthy();
        for (const topic of x.topics ?? []) {
          expect(topic[locale].trim()).toBeTruthy();
        }
      }
    }
  });

  it('keeps every session within the detail panel’s topic budget', () => {
    /*
     * The detail panel renders one line per topic into a height the fixed
     * viewport hands it - roughly three lines' worth once the label is
     * accounted for (see the budget in BoardAgenda.module.css). A fourth topic
     * does not overflow the page, but it is silently clipped, which is the
     * failure Constitution II is about. Cap it here, where it is cheap to see,
     * rather than in a layout test where it shows up as a stray pixel count.
     */
    for (const x of agenda.sessions) {
      expect((x.topics ?? []).length, `${x.id}: too many topics`).toBeLessThanOrEqual(3);
    }
  });

  it('keys topics uniquely within a session', () => {
    // The list is rendered with the EN string as its React key.
    for (const x of agenda.sessions) {
      const keys = (x.topics ?? []).map((t) => t.en);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
