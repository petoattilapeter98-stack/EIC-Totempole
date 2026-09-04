import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import type { TabMeta } from '../../types/tab';
import { accentVars } from './accent';
import styles from './TabPlaceholder.module.css';

interface TabPlaceholderProps {
  readonly meta: TabMeta;
}

/**
 * Shared placeholder rendered by every tab in this feature.
 *
 * The tab's own localized label is rendered as the heading, which is what makes
 * the placeholder *distinct per tab* — so switching tabs is verifiable from the
 * content alone, not just from nav styling (spec FR-014).
 *
 * Each tab replaces its `TabPlaceholder` usage with real content in a later
 * feature; nothing outside that tab's folder changes.
 */
export function TabPlaceholder({ meta }: TabPlaceholderProps) {
  const { locale } = useKiosk();
  const s = getStrings(locale);
  const Icon = meta.icon;

  return (
    <div className={styles.placeholder} style={accentVars(meta.accent)}>
      <div className={styles.iconWrap}>
        <Icon className={styles.icon} aria-hidden="true" />
      </div>
      <h2 className={styles.label}>{meta.label[locale]}</h2>
      <p className={styles.note}>{s.placeholderNote}</p>
    </div>
  );
}
