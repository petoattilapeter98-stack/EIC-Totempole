import { useRef, type KeyboardEvent } from 'react';

import { useKiosk } from '../../context/KioskContext';
import { getStrings } from '../../i18n/strings';
import { TABS, type TabId } from '../../tabs/registry';
import { accentVars } from '../TabPlaceholder/accent';
import styles from './TabNav.module.css';

export const tabButtonId = (id: TabId) => `tab-${id}`;
export const tabPanelId = (id: TabId) => `tabpanel-${id}`;

/**
 * Navigation bar, rendered entirely from the tab registry — there is no second
 * list of tabs anywhere, so nav and content cannot disagree about what exists.
 * Spec FR-011, FR-012, FR-013.
 *
 * Implements the WAI-ARIA tabs pattern with roving tabindex. Keyboard support
 * is required by Constitution VII even though the kiosk is touch-only, and it
 * costs almost nothing here — it is the same code that makes the nav
 * semantically correct for screen readers.
 */
export function TabNav() {
  const { activeTab, setActiveTab, locale } = useKiosk();
  const s = getStrings(locale);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const focusTab = (id: TabId) => {
    setActiveTab(id);
    tabRefs.current.get(id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        nextIndex = index === 0 ? last : index - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = last;
        break;
      default:
        return;
    }

    const next = TABS[nextIndex];
    if (next) {
      event.preventDefault();
      focusTab(next.meta.id);
    }
  };

  return (
    <nav className={styles.nav} aria-label={s.navAriaLabel}>
      <div className={styles.tablist} role="tablist" aria-label={s.navAriaLabel}>
        {TABS.map((tab, index) => {
          const { id, label, icon: Icon, accent } = tab.meta;
          const isActive = id === activeTab;

          return (
            <button
              key={id}
              ref={(el) => {
                if (el) tabRefs.current.set(id, el);
                else tabRefs.current.delete(id);
              }}
              type="button"
              role="tab"
              id={tabButtonId(id)}
              aria-selected={isActive}
              aria-controls={tabPanelId(id)}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              style={accentVars(accent)}
              onClick={() => setActiveTab(id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <Icon className={styles.icon} aria-hidden="true" />
              <span className={styles.label}>{label[locale]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
