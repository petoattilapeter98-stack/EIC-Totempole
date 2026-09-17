import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { accentVars } from '../../components/TabPlaceholder/accent';
import { EnlargedView } from '../../components/EnlargedView/EnlargedView';
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
 * The expanded state is rendered via the shared `EnlargedView`
 * (specs/004-tic-tac-toe/contracts/enlarged-view.md), which both this tab and
 * the Tic-Tac-Toe game depend on. `EnlargedView` is mounted in BOTH display
 * states (its `active` prop toggles what it renders) so that `mapArea`'s
 * children — the iframe above all — are never re-parented and therefore never
 * remount when expanding or collapsing (contract E10). Remounting the iframe
 * on every expand/collapse would lose the visitor's pan/zoom position and
 * restart the 5s load race.
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
  // Tracks whether the expand control should regain focus on collapse, without
  // making focus a render input. EnlargedView (contract E7) restores focus to
  // its own return control on expand, so only the 'expand' direction is ours.
  const pendingFocus = useRef<'expand' | null>(null);

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
  // would make this a modal in all but name (contract rules S6, S7). Only the
  // collapse -> expand direction is handled here; expand -> collapse focus is
  // EnlargedView's own responsibility (contract E7).
  useEffect(() => {
    if (pendingFocus.current === 'expand') expandRef.current?.focus();
    pendingFocus.current = null;
  }, [display]);

  const handleLoad = useCallback(() => {
    setMapStatus((current) => (current === 'loading' ? 'ready' : current));
  }, []);

  const expand = useCallback(() => {
    setDisplay('expanded');
  }, []);

  const collapse = useCallback(() => {
    pendingFocus.current = 'expand';
    setDisplay('default');
  }, []);

  const isExpanded = display === 'expanded';

  const mapArea = (
    <EnlargedView
      active={isExpanded}
      returnLabel={s.collapseLabel}
      onReturn={collapse}
      // No attractExempt: the map dims with the rest of the chrome in both
      // display states (003 FR-035). Only the Tic-Tac-Toe game view opts out.
    >
      {/*
        .mapArea is EnlargedView's CHILD, not something merged onto its panel:
        the panel owns full-viewport positioning and padding (contract E1); this
        box owns the map's own border/background framing, and is rendered
        identically whether EnlargedView is active (display:contents passes it
        straight through to .root's grid) or not.
      */}
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

        {/* The expand control is EnlargedView's counterpart: it only exists in
            the default state, matching EnlargedView's return control only
            existing while active. */}
        {!isExpanded ? (
          <button
            type="button"
            ref={expandRef}
            className={styles.stateToggle}
            onClick={expand}
            aria-label={s.expandLabel}
          >
            <Maximize2 className={styles.toggleIcon} aria-hidden="true" />
            <span className={styles.toggleLabel}>{s.expandLabel}</span>
          </button>
        ) : null}
      </div>
    </EnlargedView>
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
