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
          {s.welcomeHeadline}
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
          <linearGradient id="heroGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="heroGradB" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.15" />
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
