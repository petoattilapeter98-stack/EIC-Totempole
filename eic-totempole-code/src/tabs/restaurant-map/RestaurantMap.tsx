import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { accentVars } from '../../components/TabPlaceholder/accent';
import { MapEmbed } from './MapEmbed';
import { RestaurantList } from './RestaurantList';
import { meta } from './meta';
import { MAP_LOAD_TIMEOUT_MS } from './restaurants.static';
import { getMapStrings } from './strings';
import { useMapActivity } from './useMapActivity';
import styles from './RestaurantMap.module.css';

type DisplayState = 'default' | 'expanded';
type MapStatus = 'loading' | 'ready' | 'failed';

/**
 * Restaurant map destination.
 *
 * TWO INDEPENDENT STATE AXES (data-model.md §3):
 *   display:   'default' (content region) | 'expanded' (full viewport)
 *   mapStatus: 'loading' | 'ready' | 'failed'
 * All six combinations are reachable — a visitor can expand before the load
 * race resolves — so the loading and fallback layouts both need a
 * full-viewport form.
 *
 * WHY THERE IS NO RESET LOGIC HERE:
 * `ContentRegion` renders `<main key={activeTab}>`, so leaving this tab
 * UNMOUNTS it, and the kiosk's idle reset returns to DEFAULT_TAB_ID. Both
 * halves of spec FR-011 — reset on idle, reset on fresh entry — therefore fall
 * out of the component lifecycle. Local state is destroyed and the iframe with
 * it, taking the visitor's pan/zoom position along. Adding an explicit reset
 * path would be redundant machinery (research R6).
 *
 * The expanded state is `position: fixed`, NOT a portal or a <dialog>: it stays
 * in this module's React subtree and announces no dialog semantics, so it
 * remains an inline state change (Constitution IV).
 */
export default function RestaurantMap() {
  const { locale, signalActivity } = useKiosk();
  const s = getMapStrings(locale);

  const [display, setDisplay] = useState<DisplayState>('default');
  const [mapStatus, setMapStatus] = useState<MapStatus>(() =>
    // Offline is the one failure we can know instantly, so skip the wait.
    // `onLine === true` is NOT treated as proof of reachability — it only means
    // an interface is up, which is why the timeout below still runs.
    navigator.onLine === false ? 'failed' : 'loading',
  );

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const expandRef = useRef<HTMLButtonElement | null>(null);
  const collapseRef = useRef<HTMLButtonElement | null>(null);
  // Tracks which control to restore focus to, without making focus a render
  // input.
  const pendingFocus = useRef<'expand' | 'collapse' | null>(null);

  // Bridges touches inside the cross-origin frame to the idle timer, bounded by
  // the FR-036 ceiling. Without it, panning the map for 60s resets the kiosk.
  useMapActivity({ frameRef, onActivity: signalActivity });

  /**
   * Load race: the frame's `load` event against a 5s deadline (FR-013).
   *
   * KNOWN GAP — do not read this as complete detection. If the provider
   * responds SUCCESSFULLY with its own error page (map deleted, sharing
   * revoked, rate limited), `load` fires and we report 'ready'. The frame is
   * cross-origin and opaque, so the kiosk cannot tell the difference and the
   * fallback will not trigger. Spec FR-037 states this explicitly; the
   * companion list stays on screen naming every restaurant, which is what keeps
   * the screen useful in that case. Correcting it is an operational task, not
   * something client code can do.
   */
  useEffect(() => {
    if (mapStatus !== 'loading') return undefined;

    const id = setTimeout(() => setMapStatus('failed'), MAP_LOAD_TIMEOUT_MS);
    // Cleared on unmount AND whenever the status leaves 'loading', so a load
    // that beats the deadline cannot leave a timer behind (Constitution V).
    return () => clearTimeout(id);
  }, [mapStatus]);

  // Focus follows the state change so a keyboard or screen-reader user is not
  // stranded behind the now-covered nav. Deliberately NOT a focus trap — a trap
  // would make this a modal in all but name (contract rules S6, S7).
  useEffect(() => {
    if (pendingFocus.current === 'collapse') collapseRef.current?.focus();
    else if (pendingFocus.current === 'expand') expandRef.current?.focus();
    pendingFocus.current = null;
  }, [display]);

  const handleLoad = useCallback(() => {
    setMapStatus((current) => (current === 'loading' ? 'ready' : current));
  }, []);

  const expand = useCallback(() => {
    pendingFocus.current = 'collapse';
    setDisplay('expanded');
  }, []);

  const collapse = useCallback(() => {
    pendingFocus.current = 'expand';
    setDisplay('default');
  }, []);

  const isExpanded = display === 'expanded';

  const mapArea = (
    <div className={styles.mapArea}>
      {mapStatus === 'failed' ? (
        <div className={styles.fallback} role="status">
          <h3 className={styles.fallbackHeading}>{s.fallbackHeading}</h3>
          <p className={styles.fallbackBody}>{s.fallbackBody}</p>
          {/*
            Only the EXPANDED state repeats the list here. In the default state
            the companion list is already on screen beside the map and simply
            gains addresses (below), so rendering it twice would duplicate every
            restaurant name — the same set, listed twice, one of them redundant.
          */}
          {isExpanded ? <RestaurantList locale={locale} showAddresses /> : null}
        </div>
      ) : (
        <>
          <MapEmbed ref={frameRef} title={s.mapFrameTitle} onLoad={handleLoad} />
          {mapStatus === 'loading' ? (
            <p className={styles.loading} role="status">
              {s.loading}
            </p>
          ) : null}
        </>
      )}

      <button
        type="button"
        ref={isExpanded ? collapseRef : expandRef}
        className={styles.stateToggle}
        onClick={isExpanded ? collapse : expand}
        aria-label={isExpanded ? s.collapseLabel : s.expandLabel}
      >
        {isExpanded ? (
          <Minimize2 className={styles.toggleIcon} aria-hidden="true" />
        ) : (
          <Maximize2 className={styles.toggleIcon} aria-hidden="true" />
        )}
        <span className={styles.toggleLabel}>
          {isExpanded ? s.collapseLabel : s.expandLabel}
        </span>
      </button>
    </div>
  );

  return (
    <div
      className={`${styles.root} ${isExpanded ? styles.expanded : ''}`}
      style={accentVars(meta.accent)}
      data-display={display}
      data-map-status={mapStatus}
    >
      {mapArea}

      {/* Hidden when expanded to maximise map area (FR-029). The pin numbers
          stay visible on the map, so a visitor who read the list can still
          identify each pin. */}
      {!isExpanded ? (
        <section className={styles.listPane} aria-labelledby="restaurant-list-heading">
          <h2 id="restaurant-list-heading" className={styles.listHeading}>
            {s.listHeading}
          </h2>
          <p className={styles.listSubheading}>{s.listSubheading}</p>
          {/*
            Addresses appear only when the map is unavailable: FR-013 requires
            name AND address on screen in that case, while FR-038 keeps rows
            single-line the rest of the time so 8 entries always fit.
          */}
          <RestaurantList locale={locale} showAddresses={mapStatus === 'failed'} />
        </section>
      ) : null}
    </div>
  );
}
