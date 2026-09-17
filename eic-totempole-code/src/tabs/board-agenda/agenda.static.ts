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

  /**
   * Shown only when a visitor taps the session open.
   *
   * BOTH ARE OPTIONAL, and a session missing them still expands: the detail
   * panel always has the computed duration to show. That is deliberate - every
   * row behaving identically is what makes the affordance learnable on a
   * kiosk, where one row that silently refuses to open reads as a broken
   * screen. It also means the agenda can be updated in a hurry without writing
   * prose for every session.
   *
   * Keep both SHORT. The panel is height-capped by the fixed viewport
   * (Constitution II) and clamps anything longer rather than overflowing, so an
   * essay here is not an error - it is simply not read.
   */
  readonly description?: LocalizedText;
  readonly topics?: readonly LocalizedText[];
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
      description: {
        en: 'Chair’s welcome, followed by a review of the 2026 strategic plan against delivery to date and the priorities carried into the new financial year.',
        hu: 'Elnöki köszöntő, majd a 2026-os stratégiai terv áttekintése az eddigi teljesítés tükrében, valamint az új pénzügyi évre átvitt prioritások.',
      },
      topics: [
        { en: 'Chair’s welcome', hu: 'Elnöki köszöntő' },
        { en: '2026 plan vs. delivery', hu: '2026-os terv és teljesítés' },
        { en: 'Priorities for FY2027', hu: 'A 2027-es év prioritásai' },
      ],
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
      description: {
        en: 'Consolidated revenue, margin and headcount projections for the coming financial year, with the regional breakdown and the assumptions behind each scenario.',
        hu: 'A következő pénzügyi év konszolidált árbevételi, árrés- és létszám-előrejelzései, regionális bontásban, az egyes forgatókönyvek mögötti feltételezésekkel.',
      },
      topics: [
        { en: 'Revenue & margin outlook', hu: 'Árbevétel és árrés' },
        { en: 'Regional breakdown', hu: 'Regionális bontás' },
        { en: 'Scenario assumptions', hu: 'Forgatókönyvek feltételezései' },
      ],
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
      description: {
        en: 'How AI is being folded into delivery, staffing and internal tooling over the next four quarters — and the specific investments the board is asked to approve today.',
        hu: 'Hogyan épül be az MI a szolgáltatásba, a munkaerő-tervezésbe és a belső eszközökbe a következő négy negyedévben — és mely beruházásokat kell ma jóváhagyni.',
      },
      topics: [
        { en: 'Delivery & tooling roadmap', hu: 'Szolgáltatási ütemterv' },
        { en: 'Skills and hiring impact', hu: 'Kompetencia- és létszámhatás' },
        { en: 'Approval requests', hu: 'Jóváhagyásra váró tételek' },
      ],
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
      description: {
        en: 'Account health across the region’s twenty largest partnerships: renewals falling due, escalations closed since the last summit, and the accounts flagged for board attention.',
        hu: 'A régió húsz legnagyobb ügyfélkapcsolatának állapota: esedékes megújítások, a legutóbbi találkozó óta lezárt eszkalációk, és az igazgatósági figyelemre jelölt ügyfelek.',
      },
      topics: [
        { en: 'Renewals falling due', hu: 'Esedékes megújítások' },
        { en: 'Escalation review', hu: 'Eszkalációk áttekintése' },
        { en: 'Accounts for board attention', hu: 'Kiemelt ügyfelek' },
      ],
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
      description: {
        en: 'Open floor in the Sky Lounge. Refreshments are served throughout, and board members stay available for informal follow-up on any of the day’s sessions.',
        hu: 'Kötetlen program a Panoráma Társalgóban. Frissítőkkel; az igazgatóság tagjai elérhetők a nap bármely témájának kötetlen folytatásához.',
      },
      topics: [
        { en: 'Refreshments served', hu: 'Frissítők' },
        { en: 'Informal follow-up', hu: 'Kötetlen egyeztetés' },
        { en: 'Sky Lounge, 16th floor', hu: 'Panoráma Társalgó, 16. emelet' },
      ],
    },
  ],
};

/**
 * The content region is a fixed height and must never scroll (Constitution II,
 * spec FR-020). Rows flex-distribute the available space, so more sessions than
 * this would squash them past legibility on the 1920x1280 panel rather than
 * overflow.
 *
 * A LONGER AGENDA IS NOW SAFE TO AUTHOR: `visibleSessions` windows the list
 * around the current time instead of always taking the first N, so sessions
 * past this cap are reached by the clock rather than lost. Raising the number
 * still squashes rows, so it remains the legibility ceiling either way.
 */
export const MAX_VISIBLE_SESSIONS = 5;
