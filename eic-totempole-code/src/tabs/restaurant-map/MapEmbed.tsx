import { forwardRef } from 'react';

import { MAP_EMBED_URL } from './restaurants.static';
import styles from './RestaurantMap.module.css';

interface MapEmbedProps {
  /** Localized accessible name for the frame (spec FR-019). */
  readonly title: string;
  /** Fires when the frame reports a load — races the 5s timeout (FR-013). */
  readonly onLoad: () => void;
}

/**
 * The embedded map.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE `sandbox` VALUE IS A SECURITY BOUNDARY, NOT FORMATTING.             │
 * │                                                                         │
 * │ Its safety comes from what is NOT listed. Omitting `allow-popups`       │
 * │ blocks window.open and target="_blank"; omitting `allow-top-navigation` │
 * │ stops the frame navigating the kiosk away. My Maps embeds contain       │
 * │ "View larger map" and "Directions" links that do exactly that, and a    │
 * │ kiosk stranded on Google Maps has no keyboard, no address bar and       │
 * │ nobody present to recover it (spec FR-008).                             │
 * │                                                                         │
 * │ `allow-scripts` is required for the map to work at all.                 │
 * │ `allow-same-origin` lets the embed reach its own storage; because the   │
 * │ frame is cross-origin, granting it gives the frame no access to OUR     │
 * │ origin. (The well-known sandbox-escape risk of combining these two      │
 * │ applies only when the framed document is same-origin with the embedder.)│
 * │                                                                         │
 * │ Any change here must be re-verified by hand against SC-006 —            │
 * │ specs/003-restaurant-map/quickstart.md §2.1.                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * We deliberately do NOT set `pointer-events: none` or overlay the frame: both
 * would satisfy FR-008 by breaking the pan/zoom in FR-010. And we make no
 * attempt to read or restyle the frame's contents — that is impossible
 * cross-origin, and code that looks like it tries would mislead the next
 * reader.
 *
 * Contract: specs/003-restaurant-map/contracts/map-embed.md §1
 */
export const MapEmbed = forwardRef<HTMLIFrameElement, MapEmbedProps>(function MapEmbed(
  { title, onLoad },
  ref,
) {
  return (
    <iframe
      ref={ref}
      className={styles.frame}
      src={MAP_EMBED_URL}
      title={title}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer-when-downgrade"
      // `lazy` would defer the load and start the 5s race at an unpredictable
      // moment, making the fallback deadline meaningless.
      loading="eager"
      onLoad={onLoad}
    />
  );
});
