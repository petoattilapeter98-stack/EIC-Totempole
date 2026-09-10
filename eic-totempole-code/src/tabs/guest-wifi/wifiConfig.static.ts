/**
 * ============================================================================
 * EDITING THE GUEST NETWORK CONFIG — READ THIS FIRST
 * ============================================================================
 *
 * This is the ONLY source of truth for the guest Wi-Fi credentials shown on
 * the Guest Wi-Fi panel (both the QR code and the printed text). There is no
 * backend, no env var, and no second copy anywhere (spec FR-004).
 *
 * To update the network:
 *   1. Edit SSID/PASSWORD/SECURITY_TYPE below.
 *   2. Run `npm test` — wifiConfig.test.ts catches shape mistakes (length,
 *      empty-password-without-nopass, etc.) per data-model.md §1.
 *   3. Redeploy. That's the whole procedure (spec SC-005).
 *
 * Full shape and validation rules: specs/004-guest-wifi/data-model.md §1
 * ============================================================================
 */

/** One guest network's join credentials. See specs/004-guest-wifi/data-model.md §1. */
export interface GuestNetworkConfig {
  /** Network name. 1–32 bytes when configured; '' means "not configured" (research R7). */
  readonly ssid: string;
  /** Never translated, never masked (spec Assumptions). '' only valid with 'nopass'. */
  readonly password: string;
  /** 'WPA' covers WPA/WPA2/WPA3-Personal for QR-payload purposes (research R2). */
  readonly securityType: 'WPA' | 'nopass';
}

/**
 * ⚠️ PLACEHOLDER — REPLACE BEFORE THIS FEATURE SHIPS.
 *
 * An empty `ssid` is the deliberate "not configured" signal (research R7):
 * the panel renders the FR-014 fallback state instead of attempting to build
 * a QR code or show credentials, so the app boots and is fully testable
 * before the real guest network is known — the same posture
 * 003-restaurant-map's placeholder `MAP_ID` used.
 */
export const WIFI_CONFIG: GuestNetworkConfig = Object.freeze({
  ssid: 'TEKsystems Guest',
  password: 'WelcomeGuest2026',
  securityType: 'WPA',
});
