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
  },
  hu: {
    heading: 'Testületi Napirend',
    subheading: 'A mai program',
    liveBadge: 'Most',
    nextBadge: 'Következik',
    endedLabel: 'Véget ért',
    presenterLabel: 'Előadó',
    emptyState: 'Nincs ütemezett program',
  },
} satisfies Record<Locale, AgendaStrings>;
