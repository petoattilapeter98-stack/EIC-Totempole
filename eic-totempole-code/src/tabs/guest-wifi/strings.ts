import type { Locale, LocalizedText } from '../../i18n/locales';

/**
 * Copy owned by this tab (spec FR-006), kept here rather than in
 * src/i18n/strings.ts so deleting this folder takes its copy with it
 * (Constitution IX) — mirrors restaurant-map/strings.ts.
 *
 * The network name and password themselves are NOT here: they are literal
 * values from `wifiConfig.static.ts` / the operator's saved override, and
 * render unchanged in both locales (spec FR-006).
 */
export interface GuestWifiStrings {
  /** Primary heading — matches every other tab's self-naming h2 (registry.test.tsx). */
  readonly heading: LocalizedText;
  /** Instruction above the QR code. */
  readonly scanInstruction: LocalizedText;
  /** Label preceding the printed network name. */
  readonly networkNameLabel: LocalizedText;
  /** Label preceding the printed password. */
  readonly passwordLabel: LocalizedText;
  /** Heading shown when the network has not been configured yet (FR-014). */
  readonly fallbackHeading: LocalizedText;
  /** Explanation shown alongside the fallback heading. */
  readonly fallbackBody: LocalizedText;
  /** Accessible name + visible label for the button that opens the editor. */
  readonly editButtonLabel: LocalizedText;
  /** Heading shown while the editor is open. */
  readonly editHeading: LocalizedText;
  /** Accessible name for the WPA/open toggle group — distinct from
   * `passwordLabel` so a screen reader does not announce "Password" twice
   * back to back (once for the group, once for the password field itself). */
  readonly securityTypeLabel: LocalizedText;
  /** Label for the security-type WPA option. */
  readonly securityWpaLabel: LocalizedText;
  /** Label for the security-type open-network option. */
  readonly securityOpenLabel: LocalizedText;
  /** Commits the edit. */
  readonly saveButtonLabel: LocalizedText;
  /** Discards the edit. */
  readonly cancelButtonLabel: LocalizedText;
  /** Inline error when the network name is out of the 1-32 byte range. */
  readonly ssidLengthError: LocalizedText;
  /** Inline error when the password is out of the 8-63 character range. */
  readonly passwordLengthError: LocalizedText;
}

export const STRINGS = {
  heading: { en: 'Guest Wi-Fi', hu: 'Vendég Wi-Fi' },
  scanInstruction: { en: 'Scan to connect', hu: 'Csatlakozáshoz olvassa be' },
  networkNameLabel: { en: 'Network name', hu: 'Hálózat neve' },
  passwordLabel: { en: 'Password', hu: 'Jelszó' },
  fallbackHeading: { en: 'Wi-Fi not yet configured', hu: 'A Wi-Fi még nincs beállítva' },
  fallbackBody: {
    en: 'Ask a member of staff for the guest network details.',
    hu: 'Kérje a vendég hálózat adatait a személyzettől.',
  },
  editButtonLabel: { en: 'Edit', hu: 'Szerkesztés' },
  editHeading: { en: 'Edit guest network', hu: 'Vendéghálózat szerkesztése' },
  securityTypeLabel: { en: 'Security type', hu: 'Biztonság típusa' },
  securityWpaLabel: { en: 'Password required', hu: 'Jelszó szükséges' },
  securityOpenLabel: { en: 'Open network', hu: 'Nyitott hálózat' },
  saveButtonLabel: { en: 'Save', hu: 'Mentés' },
  cancelButtonLabel: { en: 'Cancel', hu: 'Mégse' },
  ssidLengthError: { en: 'Enter 1–32 characters.', hu: 'Adjon meg 1–32 karaktert.' },
  passwordLengthError: { en: 'Enter 8–63 characters.', hu: 'Adjon meg 8–63 karaktert.' },
} as const satisfies GuestWifiStrings;

/** Resolve every string for one locale, mirroring `getMapStrings(locale)`. */
export function getGuestWifiStrings(locale: Locale): Record<keyof GuestWifiStrings, string> {
  return {
    heading: STRINGS.heading[locale],
    scanInstruction: STRINGS.scanInstruction[locale],
    networkNameLabel: STRINGS.networkNameLabel[locale],
    passwordLabel: STRINGS.passwordLabel[locale],
    fallbackHeading: STRINGS.fallbackHeading[locale],
    fallbackBody: STRINGS.fallbackBody[locale],
    editButtonLabel: STRINGS.editButtonLabel[locale],
    editHeading: STRINGS.editHeading[locale],
    securityTypeLabel: STRINGS.securityTypeLabel[locale],
    securityWpaLabel: STRINGS.securityWpaLabel[locale],
    securityOpenLabel: STRINGS.securityOpenLabel[locale],
    saveButtonLabel: STRINGS.saveButtonLabel[locale],
    cancelButtonLabel: STRINGS.cancelButtonLabel[locale],
    ssidLengthError: STRINGS.ssidLengthError[locale],
    passwordLengthError: STRINGS.passwordLengthError[locale],
  };
}
