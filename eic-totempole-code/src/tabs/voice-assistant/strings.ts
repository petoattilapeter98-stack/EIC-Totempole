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
  /** Shown while the mic is actively capturing audio. */
  readonly listening: string;
  /** Shown while connected but between utterances (recognition briefly restarting). */
  readonly waiting: string;
  /** This browser has no SpeechRecognition implementation at all (research.md R13: Chrome-only in practice). */
  readonly micNotSupported: string;
  /** Visitor/operator denied the microphone permission prompt. */
  readonly micNoPermission: string;
  /** SpeechRecognition errored for a reason other than permission (e.g. network). */
  readonly micUnavailable: string;
  /** A recognized utterance failed to reach the assistant (Direct Line activity post failed). */
  readonly sendError: string;
}

export const voiceAssistantStrings = {
  en: {
    subheading:
      'Tap Start and just speak — ask about the Innovation Centre, the company, or our people.',
    promptsHeading: 'Try asking:',
    startButton: 'Start Assistant',
    endButton: 'End Conversation',
    connecting: 'Connecting to the assistant…',
    loadError: "The assistant couldn't be reached. Please try again.",
    retry: 'Try Again',
    listening: 'Listening…',
    waiting: 'Ready — just speak',
    micNotSupported:
      "This browser can't provide speech recognition. Please open this kiosk in Google Chrome.",
    micNoPermission: 'Microphone access is needed to talk to the assistant. Please allow it and try again.',
    micUnavailable: 'Speech recognition is temporarily unavailable. Please try again.',
    sendError: "That didn't reach the assistant. Please try asking again.",
  },
  hu: {
    subheading:
      'Érintse meg az Indítás gombot, és csak beszéljen — kérdezzen az Innovációs Központról, a vállalatról vagy munkatársainkról.',
    promptsHeading: 'Próbálja ki:',
    startButton: 'Asszisztens Indítása',
    endButton: 'Beszélgetés Befejezése',
    connecting: 'Kapcsolódás az asszisztenshez…',
    loadError: 'Az asszisztens nem érhető el. Kérjük, próbálja újra.',
    retry: 'Újra Próbálom',
    listening: 'Hallgatom…',
    waiting: 'Készen áll — csak beszéljen',
    micNotSupported:
      'Ez a böngésző nem támogatja a beszédfelismerést. Kérjük, nyissa meg a kioszkot Google Chrome-ban.',
    micNoPermission:
      'A mikrofon engedélyezése szükséges az asszisztenssel való beszélgetéshez. Engedélyezze, majd próbálja újra.',
    micUnavailable: 'A beszédfelismerés átmenetileg nem érhető el. Kérjük, próbálja újra.',
    sendError: 'Ez nem jutott el az asszisztenshez. Kérjük, kérdezzen újra.',
  },
} satisfies Record<Locale, VoiceAssistantStrings>;

export function getVoiceAssistantStrings(locale: Locale): VoiceAssistantStrings {
  return voiceAssistantStrings[locale];
}
