import { useEffect, useRef, useState } from 'react';

export type SpeechRecognitionErrorKind = 'not-supported' | 'no-permission' | 'unavailable';

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag, e.g. 'en-US' / 'hu-HU'. */
  readonly lang: string;
  /** Recognition only runs while this is true (mount/tap-gated, Constitution I -- no ambient mic capture). */
  readonly active: boolean;
  /** Called once per recognized utterance the browser considers final. */
  readonly onFinalTranscript: (text: string) => void;
}

export interface UseSpeechRecognitionResult {
  /** Live, not-yet-final text for the utterance in progress -- '' when nothing is being spoken. */
  readonly interimTranscript: string;
  /** True while the browser is actively capturing audio. */
  readonly listening: boolean;
  /** False if this browser has no SpeechRecognition implementation at all. */
  readonly supported: boolean;
  readonly error: SpeechRecognitionErrorKind | null;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Chrome's built-in speech-to-text (Web Speech API), run continuously while
 * `active` is true -- no push-to-talk button (see spec.md Clarifications,
 * 2026-09-10 amendment: the visitor presses nothing between Start and End).
 *
 * Chrome's `continuous: true` mode still stops itself after a pause in
 * speech (`onend` fires); this hook restarts it automatically while `active`
 * remains true, which is the standard way to get an effectively always-on
 * listening session out of this API.
 */
export function useSpeechRecognition({
  lang,
  active,
  onFinalTranscript,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionErrorKind | null>(null);

  const onFinalTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  });

  const Constructor = getSpeechRecognitionConstructor();
  const supported = Constructor !== null;

  useEffect(() => {
    if (!active || !Constructor) {
      return;
    }

    let stoppedByCleanup = false;
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) {
          continue;
        }
        const alternative = result[0];
        if (!alternative) {
          continue;
        }
        if (result.isFinal) {
          onFinalTranscriptRef.current(alternative.transcript.trim());
        } else {
          interim += alternative.transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('no-permission');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('unavailable');
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript('');
      // Chrome ends a "continuous" session after a pause; restart it unless
      // this is a real teardown (active became false, or unmount).
      if (!stoppedByCleanup) {
        recognition.start();
      }
    };

    recognition.start();

    return () => {
      stoppedByCleanup = true;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      setListening(false);
      setInterimTranscript('');
    };
  }, [active, lang]);

  return {
    interimTranscript,
    listening,
    supported,
    error: supported ? error : 'not-supported',
  };
}
