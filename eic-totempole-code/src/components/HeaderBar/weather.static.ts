import { Sun, type LucideIcon } from 'lucide-react';
import type { LocalizedText } from '../../i18n/locales';

export interface WeatherReading {
  readonly tempC: number;
  readonly condition: LocalizedText;
  readonly icon: LucideIcon;
}

/**
 * Static Budapest weather (spec FR-004, FR-022 — no network calls in this
 * feature).
 *
 * Deliberately isolated in its own module so the future swap to live data
 * touches exactly one file and no component logic. That live version must go
 * through a backend endpoint, never a client-side API key (Constitution VI).
 */
export const budapestWeather: WeatherReading = {
  tempC: 22,
  condition: { en: 'Sunny', hu: 'Napos' },
  icon: Sun,
};
