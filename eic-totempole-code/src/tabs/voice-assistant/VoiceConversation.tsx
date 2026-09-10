import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

import type { Locale } from '../../i18n/locales';
import { LOCALE_TAGS } from '../../i18n/locales';
import { getVoiceAssistantStrings } from './strings';
import { DIRECT_LINE_PROVISION_TOKEN_URL } from './agentConfig';
import {
  startDirectLineConversation,
  subscribeToDirectLineActivities,
  postDirectLineMessage,
  type DirectLineConversation,
} from './directLineClient';
import { useSpeechRecognition } from './useSpeechRecognition';
import styles from './VoiceConversation.module.css';

export interface VoiceConversationProps {
  readonly locale: Locale;
  /** Re-arms the shell's idle countdown (spec FR-011) -- called on every recognized utterance and every bot reply. */
  readonly reset: () => void;
}

type ConnectionStatus = 'connecting' | 'ready' | 'error';

interface TranscriptEntry {
  readonly id: number;
  readonly speaker: 'visitor' | 'assistant';
  readonly text: string;
}

/** Bounds transcript growth for a long-running conversation (Constitution V: no unbounded accumulation). */
const MAX_TRANSCRIPT_ENTRIES = 12;

/**
 * Drives the hands-free voice conversation once `AgentPanel` mounts this
 * component (spec.md 2026-09-10 amendment): connects to the bot's Direct
 * Line channel directly (no visible third-party chat UI), listens
 * continuously via Chrome's SpeechRecognition, posts each recognized
 * utterance as a message activity, and renders the bot's replies as
 * on-screen transcript text. No button is needed between Start and End.
 */
export function VoiceConversation({ locale, reset }: VoiceConversationProps) {
  const s = getVoiceAssistantStrings(locale);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([]);
  const [sendError, setSendError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const conversationRef = useRef<DirectLineConversation | null>(null);
  const resetRef = useRef(reset);
  const nextEntryId = useRef(0);
  useEffect(() => {
    resetRef.current = reset;
  });

  const appendEntry = (speaker: TranscriptEntry['speaker'], text: string) => {
    nextEntryId.current += 1;
    setTranscript((current) =>
      [...current, { id: nextEntryId.current, speaker, text }].slice(-MAX_TRANSCRIPT_ENTRIES),
    );
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    setStatus('connecting');
    setTranscript([]);
    setSendError(false);

    (async () => {
      const conversation = await startDirectLineConversation(DIRECT_LINE_PROVISION_TOKEN_URL);
      if (cancelled) {
        return;
      }
      conversationRef.current = conversation;
      unsubscribe = subscribeToDirectLineActivities(
        conversation.streamUrl,
        (activity) => {
          if (activity.type === 'message' && activity.text) {
            appendEntry('assistant', activity.text);
            resetRef.current();
          }
        },
        () => {
          if (!cancelled) {
            setStatus('error');
          }
        },
      );
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) {
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      conversationRef.current = null;
    };
  }, [reloadKey]);

  const speech = useSpeechRecognition({
    lang: LOCALE_TAGS[locale],
    active: status === 'ready',
    onFinalTranscript: (text) => {
      if (!text || !conversationRef.current) {
        return;
      }
      appendEntry('visitor', text);
      resetRef.current();
      postDirectLineMessage(conversationRef.current, text, LOCALE_TAGS[locale]).catch(() => {
        setSendError(true);
      });
    },
  });

  const handleRetry = () => setReloadKey((key) => key + 1);

  if (status !== 'ready') {
    return (
      <div className={styles.wrap}>
        <div className={styles.overlay} role="status">
          {status === 'connecting' ? (
            <p>{s.connecting}</p>
          ) : (
            <>
              <p>{s.loadError}</p>
              <button type="button" className={styles.retryButton} onClick={handleRetry}>
                {s.retry}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {speech.error && (
        <p className={styles.banner} role="status">
          {speech.error === 'not-supported'
            ? s.micNotSupported
            : speech.error === 'no-permission'
              ? s.micNoPermission
              : s.micUnavailable}
        </p>
      )}
      {sendError && (
        <p className={styles.banner} role="status">
          {s.sendError}
        </p>
      )}

      <div className={styles.listeningIndicator} aria-live="polite">
        <Mic
          className={speech.listening ? styles.micIconActive : styles.micIcon}
          aria-hidden="true"
        />
        <span>{speech.listening ? s.listening : s.waiting}</span>
      </div>

      <div className={styles.transcript} aria-live="polite">
        {transcript.length === 0 && !speech.interimTranscript && (
          <p className={styles.transcriptEmpty}>{s.subheading}</p>
        )}
        {transcript.map((entry) => (
          <p
            key={entry.id}
            className={entry.speaker === 'visitor' ? styles.visitorLine : styles.assistantLine}
          >
            {entry.text}
          </p>
        ))}
        {speech.interimTranscript && (
          <p className={styles.interimLine}>{speech.interimTranscript}</p>
        )}
      </div>
    </div>
  );
}
