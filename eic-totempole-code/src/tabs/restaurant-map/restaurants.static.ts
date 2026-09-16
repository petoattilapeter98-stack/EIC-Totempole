import type { LocalizedText } from '../../i18n/locales';

/**
 * ============================================================================
 * EDITING THE RESTAURANT LIST — READ THIS FIRST
 * ============================================================================
 *
 * This list exists in TWO places that no code can reconcile:
 *
 *   A. The pins on the Google My Maps map (MAP_ID below) — what the visitor
 *      sees ON the map.
 *   B. The RESTAURANTS array in this file — what drives the numbered companion
 *      list and the offline fallback.
 *
 * The embed is keyless and cross-origin, so the app CANNOT read A at runtime
 * and CI cannot check it either. Nothing automated can prove A and B agree.
 * That is why spec FR-023 makes any change a single editorial action:
 *
 *   1. Edit the pins on the My Maps map; set each pin's number.
 *   2. Edit RESTAURANTS below to match, renumbering so numbers stay 1..n.
 *   3. Re-save the map's default view if the geographic extent changed, so all
 *      pins still fit the initial framing in BOTH display states (FR-007/027).
 *   4. Run `npm test` — restaurants.test.ts catches shape mistakes.
 *   5. Open the tab and compare: every list number has a pin, every pin has a
 *      list entry, counts match. In both languages.
 *
 * Step 5 is the only check that catches drift. It is cheap because the list is
 * on screen during normal operation, not just in the fallback.
 *
 * Full procedure: specs/003-restaurant-map/contracts/curated-data.md
 * ============================================================================
 */

/** One curated dining location. See specs/003-restaurant-map/data-model.md §1. */
export interface RestaurantPlace {
  /** 1-based position. MUST match the pin number on the My Maps map (FR-006). */
  readonly number: number;
  /** Proper noun. Rendered as authored in both locales (FR-018). */
  readonly name: string;
  /** Street address. Shown only in the offline fallback (FR-013, FR-038). */
  readonly address: LocalizedText;
  /** Editorial estimate of walking time from the building (FR-006, FR-038). */
  readonly walkMinutes: number;
  /** Optional descriptor. NOT shown in the list — rows are single-line (FR-038). */
  readonly cuisine?: LocalizedText | undefined;
}

/**
 * ⚠️ PLACEHOLDER — REPLACE BEFORE THIS FEATURE SHIPS.
 *
 * The `mid` of the feature's Google My Maps map. This is a PUBLIC identifier,
 * not a credential (spec FR-017, research R1): anyone with the embed URL can
 * view the map, which is the intended posture for a map of public restaurants.
 *
 * Deliberately a plain module constant rather than an env var. Routing it
 * through import.meta.env would imply it is secret and invite someone to treat
 * that pattern as key-safe later, which is exactly what Constitution VI
 * forbids.
 *
 * Until this is replaced with a real `mid`, the embed cannot load and the view
 * falls back to the restaurant list after MAP_LOAD_TIMEOUT_MS. That is handled
 * by the ordinary load race — deliberately NOT special-cased, because a second
 * code path for "we know this will fail" would be one more thing to get wrong
 * for no visible difference to the visitor.
 */
export const MAP_ID = '1iUwZW3dsyb4OgN5PiN6bvfCPY3JY7jk';

/** Keyless My Maps embed. No API key, no proxy (FR-017, research R1). */
export const MAP_EMBED_URL = `https://www.google.com/maps/d/embed?mid=${MAP_ID}`;

/** Fallback deadline (spec FR-013, SC-005). */
export const MAP_LOAD_TIMEOUT_MS = 5000;

/**
 * Ceiling on map-driven idle extension (spec FR-036).
 *
 * NOT defensive padding. Iframe focus does not reliably clear when a visitor
 * walks away, so without this ceiling "the map is focused" would count as
 * activity forever and the kiosk would never idle-reset — a Constitution V
 * failure that only becomes visible after days, with no operator present.
 */
export const MAX_MAP_SESSION_SECONDS = 600;

/** Focus-transfer poll interval (research R3). */
export const MAP_FOCUS_POLL_MS = 1000;

/** Hard product limit (spec FR-031). Growing past this needs a spec change. */
export const MAX_RESTAURANTS = 8;

/**
 * The curated set, ordered by `number`.
 *
 * ⚠️ The entries below are PLACEHOLDER data pending the real curated selection
 * and the My Maps map (task T002). They are shaped correctly and satisfy every
 * invariant in restaurants.test.ts, so the feature is fully exercisable — but
 * the names, addresses and walking times are not yet real editorial choices.
 */
const RESTAURANT_DATA = [
  {
    number: 1,
    name: 'TÁLKA',
    address: { en: '43 Kassák Lajos Street', hu: 'Kassák Lajos utca 43.' },
    walkMinutes: 7,
    cuisine: { en: 'Healthy / Modern Hungarian', hu: 'Egészséges / modern magyar' },
  },
  {
    number: 2,
    name: 'Advance Kantin',
    address: { en: '1 Klapka Street', hu: 'Klapka utca 1.' },
    walkMinutes: 7,
    cuisine: { en: 'Hungarian, European & American', hu: 'Magyar, európai és amerikai' },
  },
  {
    number: 3,
    name: 'Fulin Étterem',
    address: { en: '62 Váci Road', hu: 'Váci út 62.' },
    walkMinutes: 4,
    cuisine: { en: 'Chinese / Asian', hu: 'Kínai / ázsiai' },
  },
  {
    number: 4,
    name: 'H2Gourmenza',
    address: { en: '23–27 Váci Road', hu: 'Váci út 23–27.' },
    walkMinutes: 1,
    cuisine: { en: 'Hungarian & International', hu: 'Magyar és nemzetközi' },
  },
  {
    number: 5,
    name: 'VakVarjú Étterem',
    address: { en: '4–6 Bessenyei Street', hu: 'Bessenyei utca 4–6.' },
    walkMinutes: 10,
    cuisine: { en: 'Hungarian', hu: 'Magyar' },
  },
] as const satisfies readonly RestaurantPlace[];

/**
 * Frozen at RUNTIME, not just in the type system.
 *
 * `as const` above gives compile-time `readonly`, which a plain `.ts` consumer
 * can defeat with a cast and which does nothing at all once compiled. The cap
 * in FR-031 is a layout guarantee (Constitution II) — a ninth entry pushed in
 * at runtime would silently overflow the content region on an unattended
 * display, so the guarantee needs to survive past type-checking.
 *
 * Shallow by design: the invariant being protected is the set's *size*, so
 * freezing the array itself is what matters.
 */
export const RESTAURANTS = Object.freeze(RESTAURANT_DATA);

export type CuratedRestaurant = (typeof RESTAURANTS)[number];
