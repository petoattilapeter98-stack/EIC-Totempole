import type { GuestNetworkConfig } from './wifiConfig.static';

/**
 * Namespaced so this feature's storage key can never collide with another
 * tab's (Constitution IX — each feature owns its own storage keys).
 */
const STORAGE_KEY = 'eic-totempole:guest-wifi-config';

/**
 * Validation errors keyed by field, for inline form feedback in the on-screen
 * editor. An empty object means the input is valid.
 *
 * These rules mirror data-model.md §1 rules 1 and 3, with one deliberate
 * difference: the edit form has no "not configured" sentinel to save — an
 * empty ssid here is simply invalid input, never a way to reset the network
 * to unconfigured. (Leaving the network unconfigured means never opening the
 * editor in the first place; there is no in-UI "clear" action.)
 */
export interface ConfigValidationErrors {
  readonly ssid?: string;
  readonly password?: string;
}

export function validateConfigInput(input: GuestNetworkConfig): ConfigValidationErrors {
  const errors: { ssid?: string; password?: string } = {};

  // Byte length, not character length — a handful of accented Hungarian
  // characters can be 1-32 *characters* but exceed the 32-*byte* SSID limit
  // the protocol actually enforces (data-model.md §1, research R6).
  const ssidBytes = new TextEncoder().encode(input.ssid).length;
  if (ssidBytes < 1 || ssidBytes > 32) {
    errors.ssid = 'ssidLength';
  }

  if (input.securityType === 'WPA') {
    if (input.password.length < 8 || input.password.length > 63) {
      errors.password = 'passwordLength';
    }
  }

  return errors;
}

function isValidStoredConfig(value: unknown): value is GuestNetworkConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.ssid !== 'string' || typeof v.password !== 'string') return false;
  if (v.securityType !== 'WPA' && v.securityType !== 'nopass') return false;

  const candidate: GuestNetworkConfig = {
    ssid: v.ssid,
    password: v.password,
    securityType: v.securityType,
  };
  return Object.keys(validateConfigInput(candidate)).length === 0;
}

/**
 * Reads the operator-saved override from THIS kiosk's own browser storage —
 * set via the on-screen editor, not fetched from anywhere. Returns `null` if
 * nothing has been saved yet, or if the stored value is corrupt or no longer
 * valid (e.g. hand-edited devtools storage) — in either case the caller falls
 * back to the static `WIFI_CONFIG` default, never a broken panel.
 *
 * Wrapped in try/catch: `localStorage` can throw in some browser states
 * (private browsing, storage explicitly blocked) — a kiosk that has never
 * had its network configured this way must still render normally.
 */
export function loadStoredConfig(): GuestNetworkConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidStoredConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists an operator-edited config to this kiosk's own browser storage.
 * Local to this device only — there is still no backend, no sync, and
 * nothing is sent over the network (Constitution VI, VIII).
 */
export function saveConfigOverride(config: GuestNetworkConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable (private browsing, quota, disabled) — the edit
    // still applies to the current in-memory session via the caller's own
    // state update; it just won't survive a reload. Silently degrading here
    // is preferable to a page that has no way to recover from a thrown error
    // on the kiosk's only interactive control.
  }
}
