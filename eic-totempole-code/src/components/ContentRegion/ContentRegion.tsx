import { useKiosk } from '../../context/KioskContext';
import { getTab } from '../../tabs/registry';
import { tabButtonId, tabPanelId } from '../TabNav/TabNav';

interface ContentRegionProps {
  /**
   * Layout class supplied by the shell grid (App.module.css).
   * Explicitly `| undefined` because `exactOptionalPropertyTypes` is on and CSS
   * Module keys resolve to `string | undefined` under `noUncheckedIndexedAccess`.
   */
  readonly className?: string | undefined;
}

/**
 * Renders the active tab's component inline — no routing, no page reload
 * (spec FR-013, FR-014, FR-016).
 *
 * The grid gives this row `1fr` and `min-height: 0`, so it absorbs all
 * remaining height without ever forcing the page to scroll.
 */
export function ContentRegion({ className }: ContentRegionProps) {
  const { activeTab } = useKiosk();
  const { Component } = getTab(activeTab);

  return (
    <main
      className={className}
      role="tabpanel"
      id={tabPanelId(activeTab)}
      aria-labelledby={tabButtonId(activeTab)}
      tabIndex={0}
    >
      <Component />
    </main>
  );
}
