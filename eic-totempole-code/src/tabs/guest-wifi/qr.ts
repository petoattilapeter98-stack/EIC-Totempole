import { encode } from 'uqr';

import type { GuestNetworkConfig } from './wifiConfig.static';

/**
 * Escapes `\ ; , " :` with a single preceding backslash, processing the
 * backslash itself first so an already-escaped sequence is never
 * double-escaped. Exact contract: specs/004-guest-wifi/contracts/wifi-qr-payload.md
 */
function escapeWifiField(value: string): string {
  return value.replace(/[\\;,":]/g, (char) => `\\${char}`);
}

/**
 * Builds the `WIFI:` URI payload a phone camera recognizes as a join offer.
 * Only ever called once the caller has confirmed `config.ssid !== ''`
 * (data-model.md §1 rule 4) — this function does not decide the FR-014
 * fallback itself.
 */
export function buildWifiQrPayload(config: GuestNetworkConfig): string {
  const ssid = escapeWifiField(config.ssid);
  if (config.securityType === 'nopass') {
    return `WIFI:T:nopass;S:${ssid};;`;
  }
  const password = escapeWifiField(config.password);
  return `WIFI:T:WPA;S:${ssid};P:${password};;`;
}

/**
 * Encodes a payload string into a boolean module matrix (`true` = dark),
 * with NO built-in quiet zone — `border: 0` overrides uqr's default 1-module
 * border, so the 4-module quiet zone from contracts/visual-theme.md §2 is
 * added explicitly by the caller when building the SVG, rather than relying
 * on a library default that could silently change (research R1/R3).
 *
 * `ecc: 'M'` (15% recovery) trades a slightly larger matrix for headroom a
 * screen-scanned code benefits from more than a printed one (glare, viewing
 * angle, a phone held at arm's length) — see research.md R1's T001 note.
 */
export function buildQrMatrix(payload: string): boolean[][] {
  return encode(payload, { border: 0, ecc: 'M' }).data;
}
