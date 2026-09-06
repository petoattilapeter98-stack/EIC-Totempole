import { Sparkles } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import styles from './HeroBanner.module.css';

/**
 * Hero banner: event pill, welcome headline, and a decorative geometric
 * graphic in gentle continuous motion.
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

      {/* Decorative only — not an interactive control (spec FR-010). */}
      <svg
        className={styles.graphic}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* TEKsystems brand: blue #0098D1 into navy #011C31, orange as the
              warm counterpoint. Decorative only, so contrast rules do not
              apply - see tokens.css for where they do. */}
          <linearGradient id="heroGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0098d1" />
            <stop offset="100%" stopColor="#011c31" />
          </linearGradient>
          <linearGradient id="heroGradB" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fe9225" />
            <stop offset="100%" stopColor="#e0730a" />
          </linearGradient>
          <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#011c31" floodOpacity="0.18" />
          </filter>
        </defs>
        <rect
          x="35"
          y="35"
          width="110"
          height="110"
          rx="32"
          fill="url(#heroGradA)"
          filter="url(#heroShadow)"
          transform="rotate(-8 90 90)"
        />
        <circle cx="140" cy="60" r="32" fill="url(#heroGradB)" filter="url(#heroShadow)" />
        <rect
          x="75"
          y="85"
          width="70"
          height="70"
          rx="20"
          fill="#ffffff"
          filter="url(#heroShadow)"
          transform="rotate(12 110 120)"
        />
      </svg>
    </section>
  );
}
