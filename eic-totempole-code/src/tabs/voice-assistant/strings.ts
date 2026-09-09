import type { Locale } from '../../i18n/locales';

/**
 * Tab-owned copy, not the shared shell string map (Constitution IX) --
 * mirrors the pattern every other tab's own meta/strings already follow.
 */
export interface VoiceAssistantStrings {
  readonly subheading: string;
  readonly promptsHeading: string;
  readonly startButton: string;
  readonly endButton: string;
  readonly connecting: string;
  readonly loadError: string;
  readonly retry: string;
  /**
   * Shown whenever the panel is active (spec FR-019/FR-023). Always visible,
   * not conditional on actual auth state -- this app cannot observe whether
   * the embedded, cross-origin conversation actually needs sign-in
   * (research.md R10), so it tells the visitor/operator what to expect
   * regardless, rather than guessing.
   */
  readonly signInHint: string;
}

export const voiceAssistantStrings = {
  en: {
    subheading:
      'Tap Start and ask about the Innovation Centre, the company, or our people.',
    promptsHeading: 'Try asking:',
    startButton: 'Start Assistant',
    endButton: 'End Conversation',
    connecting: 'Connecting to the assistant…',
    loadError: "The assistant couldn't be reached. Please try again.",
    retry: 'Try Again',
    signInHint:
      'If prompted, a Microsoft sign-in window will open — sign in with the shared kiosk account.',
  },
  hu: {
    subheading:
      'Érintse meg az Indítás gombot, és kérdezzen az Innovációs Központról, a vállalatról vagy munkatársainkról.',
    promptsHeading: 'Próbálja ki:',
    startButton: 'Asszisztens Indítása',
    endButton: 'Beszélgetés Befejezése',
    connecting: 'Kapcsolódás az asszisztenshez…',
    loadError: 'Az asszisztens nem érhető el. Kérjük, próbálja újra.',
    retry: 'Újra Próbálom',
    signInHint:
      'Ha a rendszer kéri, megnyílik egy Microsoft bejelentkezési ablak — jelentkezzen be a megosztott kioszk fiókkal.',
  },
} satisfies Record<Locale, VoiceAssistantStrings>;

export function getVoiceAssistantStrings(locale: Locale): VoiceAssistantStrings {
  return voiceAssistantStrings[locale];
}
