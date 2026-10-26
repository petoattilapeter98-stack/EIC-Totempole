import { Sparkles } from 'lucide-react';

import logoUrl from '../../assets/brand/teksystems-logo.svg';
import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import styles from './HeroBanner.module.css';

/**
 * Hero banner: event pill, welcome headline, and the TEKsystems logo in gentle
 * continuous motion.
 * Spec FR-008, FR-009, FR-010.
 */
export function HeroBanner() {
  const { locale } = useKiosk();
  const s = getStrings(locale);

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.pill}>
          <Sparkles className={styles.pillIcon} aria-hidden="true" />
          <span>{s.eventPill}</span>
        </div>

        <h2 className={styles.headline}>
          <span className={styles.headlineLead}>{s.welcomeHeadline}</span>
          <span className={styles.headlineAccent}>{s.welcomeHeadlineAccent}</span>
        </h2>

        <p className={styles.subline}>
          {s.welcomeSubline}{' '}
          <span className={styles.sublineEmphasis}>{s.welcomeSublineEmphasis}</span>
        </p>
      </div>

      {/* Official TEKsystems logo (src/assets/brand). Decorative only - the
          headline beside it already names the company - and not an
          interactive control (spec FR-010). */}
      <img className={styles.logo} src={logoUrl} alt="" draggable={false} />
    </section>
  );
}
