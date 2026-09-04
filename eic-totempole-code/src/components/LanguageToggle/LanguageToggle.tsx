import { Globe } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import styles from './LanguageToggle.module.css';

/**
 * EN/HU language toggle (spec FR-005, FR-006, FR-007).
 *
 * The accessible name announces the language it switches TO, which is what a
 * screen-reader user needs to predict the outcome. `aria-pressed` exposes the
 * non-default (Hungarian) state.
 */
export function LanguageToggle() {
  const { locale, toggleLocale } = useKiosk();
  const s = getStrings(locale);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleLocale}
      aria-label={s.languageToggleAria}
      aria-pressed={locale === 'hu'}
    >
      <Globe className={styles.icon} aria-hidden="true" />
      <span className={styles.current} aria-hidden="true">
        {locale === 'en' ? (
          <>
            EN <span className={styles.inactive}>/ HU</span>
          </>
        ) : (
          <>
            HU <span className={styles.inactive}>/ EN</span>
          </>
        )}
      </span>
    </button>
  );
}
