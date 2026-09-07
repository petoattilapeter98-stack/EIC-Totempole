import type { LocalizedText } from '../../i18n/locales';
import type { AccentName } from '../../types/tab';

/**
 * THE FILE TO EDIT when the real agenda is finalised.
 *
 * Everything else in this tab reads from here, so replacing the content is a
 * single-file change and TypeScript will reject anything that does not fit the
 * shape below. Same isolation pattern as HeaderBar/weather.static.ts.
 */

export interface AgendaSession {
  readonly id: string;

  /** 24-hour local wall-clock time, "HH:MM". */
  readonly start: string;
  readonly end: string;

  readonly title: LocalizedText;
  readonly presenter: LocalizedText;
  readonly room: LocalizedText;

  /** Category colour. Identity only - never used for body text (research R10). */
  readonly accent: AccentName;
}

export interface AgendaDay {
  readonly label: LocalizedText;
  readonly sessions: readonly AgendaSession[];
}

/**
 * Times are stored as wall-clock strings rather than Dates on purpose: the
 * kiosk runs for days, and a hardcoded date would silently go stale overnight.
 * Comparing time-of-day means the schedule reads correctly every day until
 * real data replaces it.
 */
export const agenda: AgendaDay = {
  label: {
    en: 'Board of Directors Summit',
    hu: 'Igazgatósági Csúcstalálkozó',
  },
  sessions: [
    {
      id: 'opening',
      start: '09:00',
      end: '10:30',
      title: {
        en: 'Opening & Strategic Review',
        hu: 'Megnyitó és Stratégiai Áttekintés',
      },
      presenter: { en: 'Executive Board', hu: 'Igazgatóság' },
      room: { en: 'Boardroom A', hu: 'Tárgyaló A' },
      accent: 'violet',
    },
    {
      id: 'financial-outlook',
      start: '10:45',
      end: '12:00',
      title: {
        en: 'FY2027 Financial Outlook',
        hu: '2027-es Pénzügyi Kilátások',
      },
      presenter: { en: 'Finance Committee', hu: 'Pénzügyi Bizottság' },
      room: { en: 'Boardroom A', hu: 'Tárgyaló A' },
      accent: 'blue',
    },
    {
      id: 'ai-keynote',
      start: '13:00',
      end: '14:15',
      title: {
        en: 'Keynote: AI Strategy & Roadmap',
        hu: 'Vitaindító: MI Stratégia és Ütemterv',
      },
      presenter: { en: 'Office of the CTO', hu: 'Műszaki Igazgatóság' },
      room: { en: 'Auditorium', hu: 'Előadóterem' },
      accent: 'cyan',
    },
    {
      id: 'client-review',
      start: '14:30',
      end: '15:45',
      title: {
        en: 'Client Partnership Review',
        hu: 'Ügyfélkapcsolati Áttekintés',
      },
      presenter: { en: 'Client Services', hu: 'Ügyfélszolgálat' },
      room: { en: 'Boardroom B', hu: 'Tárgyaló B' },
      accent: 'emerald',
    },
    {
      id: 'networking',
      start: '16:00',
      end: '17:00',
      title: {
        en: 'Networking & Refreshments',
        hu: 'Kötetlen Beszélgetés és Frissítők',
      },
      presenter: { en: 'All attendees', hu: 'Minden résztvevő' },
      room: { en: 'Sky Lounge', hu: 'Panoráma Társalgó' },
      accent: 'amber',
    },
  ],
};

/**
 * The content region is a fixed height and must never scroll (Constitution II,
 * spec FR-020). Rows flex-distribute the available space, so more sessions than
 * this would squash them past legibility on the 1920x1280 panel rather than
 * overflow. If the real agenda is longer, paginate or group it - do not just
 * raise this number.
 */
export const MAX_VISIBLE_SESSIONS = 5;
