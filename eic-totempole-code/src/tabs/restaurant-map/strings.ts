import type { Locale, LocalizedText } from '../../i18n/locales';

/**
 * Copy owned by this tab (spec FR-018).
 *
 * Lives here rather than in src/i18n/strings.ts so the feature stays removable
 * as one folder (Constitution IX) — deleting this directory takes its copy with
 * it instead of leaving orphaned keys in the shell's string map.
 *
 * Restaurant proper names are NOT here: they are authored once in
 * restaurants.static.ts and render as authored in both locales.
 */
export interface RestaurantMapStrings {
  /**
   * Primary heading for the destination.
   *
   * Matches the tab's nav label on purpose: every tab in this codebase renders
   * an h2 naming itself, which is what makes "switching tabs is verifiable from
   * the content alone" true and is asserted by registry.test.tsx.
   */
  readonly listHeading: LocalizedText;
  /** Sub-heading under the primary one, mirroring the Board Agenda pattern. */
  readonly listSubheading: LocalizedText;
  /** Accessible name for the embedded map frame. */
  readonly mapFrameTitle: LocalizedText;
  /** Expand control label + accessible name. */
  readonly expandLabel: LocalizedText;
  /** Return-to-default control label + accessible name. */
  readonly collapseLabel: LocalizedText;
  /** Shown while the map is still loading. */
  readonly loading: LocalizedText;
  /** Fallback headline when the map could not be loaded. */
  readonly fallbackHeading: LocalizedText;
  /** Fallback explanation — says what happened without blaming the visitor. */
  readonly fallbackBody: LocalizedText;
  /** Suffix for walking time, e.g. "5 min" / "5 perc". */
  readonly walkMinutesSuffix: LocalizedText;
  /** Accessible label for the walking time, read in full by screen readers. */
  readonly walkMinutesAria: LocalizedText;
}

export const STRINGS = {
  listHeading: { en: 'Restaurants', hu: 'Éttermek' },
  listSubheading: { en: 'Nearby, on foot', hu: 'A közelben, gyalog' },
  mapFrameTitle: {
    en: 'Map of nearby restaurants',
    hu: 'Közeli éttermek térképe',
  },
  expandLabel: { en: 'Enlarge map', hu: 'Térkép nagyítása' },
  collapseLabel: { en: 'Close enlarged map', hu: 'Nagyított térkép bezárása' },
  loading: { en: 'Loading map…', hu: 'Térkép betöltése…' },
  fallbackHeading: { en: 'Map unavailable', hu: 'A térkép nem érhető el' },
  fallbackBody: {
    en: 'The live map could not be loaded. The restaurants below are still nearby.',
    hu: 'Az élő térkép nem tölthető be. Az alábbi éttermek továbbra is a közelben vannak.',
  },
  walkMinutesSuffix: { en: 'min', hu: 'perc' },
  walkMinutesAria: { en: 'minutes on foot', hu: 'perc gyalog' },
} as const satisfies RestaurantMapStrings;

/**
 * Resolve every string for one locale.
 *
 * Mirrors the shell's `getStrings(locale)` shape so the feature reads like the
 * rest of the codebase rather than inventing a second i18n idiom.
 */
export function getMapStrings(locale: Locale): Record<keyof RestaurantMapStrings, string> {
  return {
    listHeading: STRINGS.listHeading[locale],
    listSubheading: STRINGS.listSubheading[locale],
    mapFrameTitle: STRINGS.mapFrameTitle[locale],
    expandLabel: STRINGS.expandLabel[locale],
    collapseLabel: STRINGS.collapseLabel[locale],
    loading: STRINGS.loading[locale],
    fallbackHeading: STRINGS.fallbackHeading[locale],
    fallbackBody: STRINGS.fallbackBody[locale],
    walkMinutesSuffix: STRINGS.walkMinutesSuffix[locale],
    walkMinutesAria: STRINGS.walkMinutesAria[locale],
  };
}
