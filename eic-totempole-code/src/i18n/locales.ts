/**
 * Localization primitives. No i18n library: two locales and a dozen strings
 * of static chrome copy do not justify a runtime dependency (research.md R3).
 */

export const LOCALES = ['en', 'hu'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * A string in every supported locale.
 *
 * Because this is `Record<Locale, string>`, a value that supplies only `en`
 * is a compile error — no string can be silently left untranslated. Adding a
 * third locale later deliberately breaks every literal, forcing a translation
 * pass rather than shipping half-localized copy.
 */
export type LocalizedText = Record<Locale, string>;

export const DEFAULT_LOCALE: Locale = 'en';

/** BCP-47 tags for Intl formatting (dates, times, numbers). */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-GB',
  hu: 'hu-HU',
};

export function nextLocale(current: Locale): Locale {
  return current === 'en' ? 'hu' : 'en';
}
