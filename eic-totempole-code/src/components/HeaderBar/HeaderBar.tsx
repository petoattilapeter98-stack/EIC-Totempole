import { Clock } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { useClock } from '../../hooks/useClock';
import { LOCALE_TAGS } from '../../i18n/locales';
import { getStrings } from '../../i18n/strings';
import { LanguageToggle } from '../LanguageToggle/LanguageToggle';
import styles from './HeaderBar.module.css';
import { budapestWeather } from './weather.static';

/**
 * Header bar: branding with a pulsing live indicator, a per-second clock and
 * date, static Budapest weather, and the language toggle.
 * Spec FR-001 – FR-005.
 */
export function HeaderBar() {
  const { locale } = useKiosk();
  const { now } = useClock();
  const s = getStrings(locale);

  const tag = LOCALE_TAGS[locale];
  const time = now.toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const date = now.toLocaleDateString(tag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const WeatherIcon = budapestWeather.icon;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.mark} aria-hidden="true">
          T
        </div>
        <div>
          <h1 className={styles.brandName}>
            {s.brandName}
            <span className={styles.statusDot} aria-hidden="true" />
            <span className="sr-only">{s.statusLiveAria}</span>
          </h1>
          <p className={styles.brandSubtitle}>{s.brandSubtitle}</p>
        </div>
      </div>

      <div className={styles.cluster}>
        <div className={styles.chip}>
          <WeatherIcon
            className={`${styles.chipIcon} ${styles.weatherIcon}`}
            aria-hidden="true"
          />
          <div className={styles.chipStack}>
            <span className={styles.chipPrimary}>{budapestWeather.tempC}&deg;C</span>
            <span className={styles.chipSecondary}>
              {s.weatherCity} &middot; {budapestWeather.condition[locale]}
            </span>
          </div>
        </div>

        <div className={styles.chip}>
          <Clock className={`${styles.chipIcon} ${styles.clockIcon}`} aria-hidden="true" />
          <div className={styles.chipStack}>
            <time
              className={`${styles.chipPrimary} ${styles.clockValue}`}
              dateTime={now.toISOString()}
            >
              {time}
            </time>
            <span className={styles.chipSecondary}>{date}</span>
          </div>
        </div>

        <LanguageToggle />
      </div>
    </header>
  );
}
