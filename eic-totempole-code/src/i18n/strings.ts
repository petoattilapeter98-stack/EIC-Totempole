import type { Locale } from './locales';

/**
 * Shell chrome copy — the text not owned by any individual tab.
 *
 * Tab labels deliberately do NOT live here: they live in each tab's own
 * `meta.ts`, which is what keeps "adding a tab means one folder and one
 * registry line, nothing else" true (research.md R3, Constitution IX).
 */
export interface ShellStrings {
  /** Brand name — not translated, but kept here so the header has one source. */
  readonly brandName: string;
  readonly brandSubtitle: string;
  readonly eventPill: string;
  readonly welcomeHeadline: string;
  readonly welcomeHeadlineAccent: string;
  readonly welcomeSubline: string;
  readonly welcomeSublineEmphasis: string;
  readonly weatherCity: string;
  readonly footerHint: string;
  readonly footerResetLabel: string;
  readonly footerKioskLabel: string;
  readonly languageToggleAria: string;
  readonly navAriaLabel: string;
  readonly statusLiveAria: string;
  readonly placeholderNote: string;
}

/**
 * `satisfies Record<Locale, ShellStrings>` means a key added to `en` but not
 * `hu` fails to compile. That is the whole enforcement mechanism for FR-007.
 */
export const strings = {
  en: {
    brandName: 'TEKsystems Budapest',
    brandSubtitle: 'Executive Lobby Kiosk',
    eventPill: 'Board of Directors Summit',
    welcomeHeadline: 'Welcome to',
    welcomeHeadlineAccent: 'TEKsystems Budapest',
    welcomeSubline: 'Delighted to host the',
    welcomeSublineEmphasis: 'Board of Directors and our visiting clients',
    weatherCity: 'Budapest',
    footerHint: 'Touch a tab to switch view',
    footerResetLabel: 'Auto-reset in',
    footerKioskLabel: 'Surface Hub Interactive Entrance Kiosk',
    languageToggleAria: 'Switch language to Hungarian',
    navAriaLabel: 'Kiosk sections',
    statusLiveAria: 'System status: live',
    placeholderNote: 'Content coming soon',
  },
  hu: {
    brandName: 'TEKsystems Budapest',
    brandSubtitle: 'Vezetői Fogadótér Kioszk',
    eventPill: 'Igazgatósági Csúcstalálkozó',
    welcomeHeadline: 'Üdvözöljük a',
    welcomeHeadlineAccent: 'TEKsystems Budapesten',
    welcomeSubline: 'Örömmel látjuk vendégül',
    welcomeSublineEmphasis: 'az Igazgatóságot és látogató ügyfeleinket',
    weatherCity: 'Budapest',
    footerHint: 'Érintsen egy fület a váltáshoz',
    footerResetLabel: 'Automatikus visszaállítás',
    footerKioskLabel: 'Surface Hub Interaktív Fogadótéri Kioszk',
    languageToggleAria: 'Nyelv váltása angolra',
    navAriaLabel: 'Kioszk szekciók',
    statusLiveAria: 'Rendszer állapota: aktív',
    placeholderNote: 'A tartalom hamarosan érkezik',
  },
} satisfies Record<Locale, ShellStrings>;

export function getStrings(locale: Locale): ShellStrings {
  return strings[locale];
}
