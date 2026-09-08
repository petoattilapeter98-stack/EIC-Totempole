import type { TabModule } from '../types/tab';

import BoardAgenda, { meta as boardAgendaMeta } from './board-agenda';
import LocalTransit, { meta as localTransitMeta } from './local-transit';
import CompanyHighlights, { meta as companyHighlightsMeta } from './company-highlights';
import GuestWifi, { meta as guestWifiMeta } from './guest-wifi';
import RestaurantMap, { meta as restaurantMapMeta } from './restaurant-map';

/**
 * The single tab registry. The nav bar and the content region both render from
 * this array — there is no second list anywhere, so they cannot disagree about
 * what exists.
 *
 * ADDING A TAB: create src/tabs/<id>/ (meta.ts + index.tsx) and add one entry
 * below. Nothing else in the codebase changes.
 *
 * `as const satisfies readonly TabModule[]` is LOAD-BEARING:
 *   - `as const` preserves the literal `id` types so `TabId` is a usable union
 *   - `satisfies` validates every entry without widening the array
 * Writing `const TABS: TabModule[] = [...]` instead would widen `id` to `string`
 * and silently destroy every downstream compile-time guarantee.
 */
export const TABS = [
  { meta: boardAgendaMeta, Component: BoardAgenda },
  { meta: localTransitMeta, Component: LocalTransit },
  { meta: companyHighlightsMeta, Component: CompanyHighlights },
  { meta: guestWifiMeta, Component: GuestWifi },
  { meta: restaurantMapMeta, Component: RestaurantMap },
] as const satisfies readonly TabModule[];

/**
 * Derived from the registry itself, so an id that is not registered — including
 * the 'campus-map' referenced in the original technical input — is a COMPILE
 * ERROR at the call site, not a blank content region at runtime.
 */
export type TabId = (typeof TABS)[number]['meta']['id'];

/**
 * Default active tab on load (spec FR-015) and the idle auto-reset target
 * (spec FR-019).
 */
export const DEFAULT_TAB_ID = 'board-agenda' satisfies TabId;

export function getTab(id: TabId): (typeof TABS)[number] {
  const tab = TABS.find((t) => t.meta.id === id);
  if (!tab) {
    // Unreachable while TabId is derived from TABS; guards against a future
    // refactor that decouples the two.
    throw new Error(`Unknown tab id: ${id}`);
  }
  return tab;
}
