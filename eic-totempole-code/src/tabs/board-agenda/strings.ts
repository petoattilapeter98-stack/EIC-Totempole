import type { Locale } from '../../i18n/locales';

/**
 * Copy owned by this tab. Lives here rather than in the central
 * src/i18n/strings.ts so the tab stays self-contained and removable
 * (Constitution IX) - the same reasoning that keeps nav labels in meta.ts.
 */
export interface AgendaStrings {
  readonly heading: string;
  readonly subheading: string;
  readonly liveBadge: string;
  readonly nextBadge: string;
  readonly endedLabel: string;
  readonly presenterLabel: string;
  readonly emptyState: string;

  /**
   * Named action for the row toggle, for assistive tech only - on screen the
   * chevron carries it. A visible "Show details" on every row would repeat five
   * times down a panel whose rows are already the tallest thing on it.
   */
  readonly showDetails: string;
  readonly hideDetails: string;

  readonly durationLabel: string;
  readonly topicsLabel: string;
  /** Unit suffixes for a formatted duration, e.g. "1 h 30 min". */
  readonly hourSuffix: string;
  readonly minuteSuffix: string;

  /** Day-boundary notices. `{time}` is substituted with the first start time. */
  readonly dayNotStarted: string;
  readonly dayEnded: string;
}

export const agendaStrings = {
  en: {
    heading: 'Board Agenda',
    subheading: 'Today’s schedule',
    liveBadge: 'Now',
    nextBadge: 'Up next',
    endedLabel: 'Ended',
    presenterLabel: 'Presented by',
    emptyState: 'No sessions scheduled',
    showDetails: 'Show session details',
    hideDetails: 'Hide session details',
    durationLabel: 'Duration',
    topicsLabel: 'Topics',
    hourSuffix: 'h',
    minuteSuffix: 'min',
    dayNotStarted: 'Begins at {time}',
    dayEnded: 'Today’s sessions have ended',
  },
  hu: {
    heading: 'Testületi Napirend',
    subheading: 'A mai program',
    liveBadge: 'Most',
    nextBadge: 'Következik',
    endedLabel: 'Véget ért',
    presenterLabel: 'Előadó',
    emptyState: 'Nincs ütemezett program',
    showDetails: 'Részletek megjelenítése',
    hideDetails: 'Részletek elrejtése',
    durationLabel: 'Időtartam',
    topicsLabel: 'Témák',
    hourSuffix: 'ó',
    minuteSuffix: 'perc',
    dayNotStarted: 'Kezdés {time} órakor',
    dayEnded: 'A mai program véget ért',
  },
} satisfies Record<Locale, AgendaStrings>;

/**
 * "1 h 30 min" / "45 min", in the current locale's units.
 *
 * The hour part is dropped below 60 minutes rather than shown as "0 h", and the
 * minute part is dropped on a whole hour, so no session ever reads "2 h 0 min".
 */
export function formatDuration(minutes: number, s: AgendaStrings): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${s.hourSuffix}`);
  if (rest > 0 || hours === 0) parts.push(`${rest} ${s.minuteSuffix}`);

  return parts.join(' ');
}
