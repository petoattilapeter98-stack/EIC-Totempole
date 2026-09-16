import type { Locale } from '../../i18n/locales';
import { getMapStrings } from './strings';
import { RESTAURANTS } from './restaurants.static';
import styles from './RestaurantMap.module.css';

interface RestaurantListProps {
  readonly locale: Locale;
  /**
   * Show street addresses. Off while the map is working, where rows must stay
   * single-line to keep 8 entries inside the content region (spec FR-038); on
   * when the map is unavailable, where FR-013 requires name AND address on
   * screen.
   *
   * One component in both roles ON PURPOSE: the fallback and the normal list
   * then render from the same array and cannot disagree about which
   * restaurants exist (research R10).
   */
  readonly showAddresses?: boolean | undefined;
}

/**
 * The numbered companion list.
 *
 * This is the ONLY localized, provider-independent, assistive-technology
 * readable representation of the restaurant names (spec FR-030). The embedded
 * map's pins cannot be given accessible names — they live inside a cross-origin
 * frame — so nothing here may fall back to them.
 *
 * It also does quiet double duty: because it is on screen during normal
 * operation, a mismatch between the list and the map's pins is visible to
 * anyone looking at the kiosk, which is the practical defence against the
 * FR-023 drift that no test can catch.
 */
export function RestaurantList({ locale, showAddresses }: RestaurantListProps) {
  const s = getMapStrings(locale);

  return (
    <ol className={styles.list} aria-label={s.listHeading}>
      {RESTAURANTS.map((restaurant) => (
        <li key={restaurant.number} className={styles.row}>
          <span className={styles.marker} aria-hidden="true">
            {restaurant.number}
          </span>

          <span className={styles.rowBody}>
            <span className={styles.name}>{restaurant.name}</span>
            {showAddresses ? (
              <span className={styles.address}>{restaurant.address[locale]}</span>
            ) : null}
          </span>

          {/*
            Visually "5 min", but announced as "5 minutes on foot" — the
            abbreviation is legible at kiosk distance while assistive tech gets
            the full phrase (Constitution VII).
          */}
          <span className={styles.walk}>
            <span aria-hidden="true">
              {restaurant.walkMinutes} {s.walkMinutesSuffix}
            </span>
            <span className={styles.srOnly}>
              {restaurant.walkMinutes} {s.walkMinutesAria}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
