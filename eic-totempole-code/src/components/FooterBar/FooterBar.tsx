import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import styles from './FooterBar.module.css';

/**
 * Footer with the visible idle countdown (spec FR-017).
 *
 * `aria-live="off"` is deliberate: a per-second live region would make a screen
 * reader announce a number every second, rendering the kiosk unusable
 * (contracts/ui-structure.md §3).
 */
export function FooterBar() {
  const { locale, remainingSeconds } = useKiosk();
  const s = getStrings(locale);

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.dot} aria-hidden="true" />
        <span>{s.footerKioskLabel}</span>
      </div>

      <div className={styles.right}>
        <span>{s.footerHint}</span>
        <span className={styles.divider} aria-hidden="true">
          |
        </span>
        <span aria-live="off">
          {s.footerResetLabel}{' '}
          <span className={styles.countdown} data-testid="idle-countdown">
            {remainingSeconds}s
          </span>
        </span>
      </div>
    </footer>
  );
}
