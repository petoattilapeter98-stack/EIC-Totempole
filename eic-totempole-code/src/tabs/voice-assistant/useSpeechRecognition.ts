import { useEffect, useRef, useState } from 'react';

export type SpeechRecognitionErrorKind = 'not-supported' | 'no-permission' | 'unavailable';

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag, e.g. 'en-US' / 'hu-HU'. */
  readonly lang: string;
  /** Recognition only runs while this is true (mount/tap-gated, Constitution I -- no ambient mic capture). */
  readonly active: boolean;
  /**
   * Called at most once per activation (one push-to-talk press), after
   * `active` goes false, with every final segment recognized during that
   * activation joined into one string. Not called if nothing was recognized.
   */
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

/** How long to wait for the stopped recognizer's `onend` before flushing anyway. */
const FLUSH_FALLBACK_MS = 2000;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Chrome's built-in speech-to-text (Web Speech API), run for as long as
 * `active` is true -- driven by a push-to-talk button (AgentPanel/
 * VoiceConversation): `active` follows the button being held down, so a
 * demo presenter controls exactly when the mic is capturing instead of the
 * kiosk listening continuously, including while the assistant is composing
 * its reply.
 *
 * Chrome's `continuous: true` mode can still stop itself mid-hold after a
 * pause in speech (`onend` fires); this hook restarts it automatically while
 * `active` remains true, so a brief pause doesn't end the utterance early.
 * On an intentional deactivation (button released, or unmount) it calls
 * `stop()` rather than `abort()`, so Chrome finishes processing whatever was
 * already captured and still fires a final result for it -- `abort()` would
 * silently drop the last few words spoken right before release.
 *
 * Chrome finalizes a result at every pause, so final results are buffered
 * for the whole activation and handed to `onFinalTranscript` once, joined,
 * when the stopped recognizer ends -- one press sends one question, no
 * matter how many times the visitor paused while holding the button.
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
    // Everything Chrome finalizes during this one activation (one press of
    // the talk button). Chrome finalizes a segment at every pause even in
    // continuous mode, so these are buffered and sent as a single utterance
    // once the activation ends, instead of one message per pause.
    const finalSegments: string[] = [];
    let flushed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const joinSegments = (...extra: string[]) =>
      [...finalSegments, ...extra].join(' ').replace(/\s+/g, ' ').trim();

    const flush = () => {
      clearTimeout(fallbackTimer);
      if (flushed) {
        return;
      }
      flushed = true;
      const text = joinSegments();
      if (text) {
        onFinalTranscriptRef.current(text);
      }
    };

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
          finalSegments.push(alternative.transcript.trim());
        } else {
          interim += alternative.transcript;
        }
      }
      // Final results (above) are always buffered, including the trailing
      // one stop() produces after release -- but the live display itself is
      // skipped once cleanup has already cleared it, so a late partial
      // result from the outgoing instance can't flash stale text over a
      // newly started press.
      if (!stoppedByCleanup) {
        setInterimTranscript(joinSegments(interim));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('no-permission');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('unavailable');
      }
    };

    recognition.onend = () => {
      if (stoppedByCleanup) {
        // The session stop() ended has now delivered everything it had
        // captured -- send the whole press as one utterance.
        flush();
        return;
      }
      // Chrome ends a "continuous" session after a pause; restart it while
      // the button is still held, keeping what was said so far on screen.
      setListening(false);
      setInterimTranscript(joinSegments());
      recognition.start();
    };

    recognition.start();

    return () => {
      stoppedByCleanup = true;
      recognition.onstart = null;
      recognition.onerror = null;
      // `onresult` and `onend` deliberately stay attached: stop() (unlike
      // abort()) keeps processing whatever audio it already captured, fires
      // a final result for it -- the tail end of what the visitor said as
      // they released the button -- and then fires `onend`, which flushes.
      recognition.stop();
      // Safety net in case this instance never fires `onend` (e.g. it had
      // already failed); flush() clears this timer and is idempotent.
      fallbackTimer = setTimeout(flush, FLUSH_FALLBACK_MS);
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
