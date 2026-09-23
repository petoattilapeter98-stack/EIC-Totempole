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
  /** Shown on the mic button while it is held down and actively capturing audio. */
  readonly listening: string;
  /** Shown on the mic button while it is not pressed (push-to-talk idle state). */
  readonly holdToTalk: string;
  /** This browser has no SpeechRecognition implementation at all (research.md R13: Chrome-only in practice). */
  readonly micNotSupported: string;
  /** Visitor/operator denied the microphone permission prompt. */
  readonly micNoPermission: string;
  /** SpeechRecognition errored for a reason other than permission (e.g. network). */
  readonly micUnavailable: string;
  /** A recognized utterance failed to reach the assistant (Direct Line activity post failed). */
  readonly sendError: string;
  /** Shown in the transcript from the moment a question is sent until the assistant's reply arrives. */
  readonly thinking: string;
}

export const voiceAssistantStrings = {
  en: {
    subheading:
      'Tap Start, then hold the mic button and speak — ask about the Innovation Centre, the company, or our people.',
    promptsHeading: 'Try asking:',
    startButton: 'Start Assistant',
    endButton: 'End Conversation',
    connecting: 'Connecting to the assistant…',
    loadError: "The assistant couldn't be reached. Please try again.",
    retry: 'Try Again',
    listening: 'Listening…',
    holdToTalk: 'Hold to Talk',
    micNotSupported:
      "This browser can't provide speech recognition. Please open this kiosk in Google Chrome.",
    micNoPermission: 'Microphone access is needed to talk to the assistant. Please allow it and try again.',
    micUnavailable: 'Speech recognition is temporarily unavailable. Please try again.',
    sendError: "That didn't reach the assistant. Please try asking again.",
    thinking: 'The assistant is thinking…',
  },
  hu: {
    subheading:
      'Érintse meg az Indítás gombot, majd tartsa lenyomva a mikrofon gombot, és beszéljen — kérdezzen az Innovációs Központról, a vállalatról vagy munkatársainkról.',
    promptsHeading: 'Próbálja ki:',
    startButton: 'Asszisztens Indítása',
    endButton: 'Beszélgetés Befejezése',
    connecting: 'Kapcsolódás az asszisztenshez…',
    loadError: 'Az asszisztens nem érhető el. Kérjük, próbálja újra.',
    retry: 'Újra Próbálom',
    listening: 'Hallgatom…',
    holdToTalk: 'Tartsa lenyomva a beszédhez',
    micNotSupported:
      'Ez a böngésző nem támogatja a beszédfelismerést. Kérjük, nyissa meg a kioszkot Google Chrome-ban.',
    micNoPermission:
      'A mikrofon engedélyezése szükséges az asszisztenssel való beszélgetéshez. Engedélyezze, majd próbálja újra.',
    micUnavailable: 'A beszédfelismerés átmenetileg nem érhető el. Kérjük, próbálja újra.',
    sendError: 'Ez nem jutott el az asszisztenshez. Kérjük, kérdezzen újra.',
    thinking: 'Az asszisztens gondolkodik…',
  },
} satisfies Record<Locale, VoiceAssistantStrings>;

export function getVoiceAssistantStrings(locale: Locale): VoiceAssistantStrings {
  return voiceAssistantStrings[locale];
}
