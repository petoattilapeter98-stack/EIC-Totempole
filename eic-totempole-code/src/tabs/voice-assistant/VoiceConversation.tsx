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
import { renderMarkdown } from './markdown';
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
/** Bounds the outgoing-echo dedup queue -- echoes arrive within one round trip, so this never needs to be large. */
const MAX_PENDING_ECHOES = 5;

/**
 * Drives the voice conversation once `AgentPanel` mounts this component
 * (spec.md 2026-09-10 amendment; push-to-talk amendment 2026-09-23):
 * connects to the bot's Direct Line channel directly (no visible
 * third-party chat UI), posts each recognized utterance as a message
 * activity, and renders the bot's replies as on-screen transcript text.
 *
 * The mic is push-to-talk, not always-on: it only captures while the
 * visitor holds the talk button, so a noisy room or the assistant's own
 * reply being read out loud can't be picked up as a new question.
 */
export function VoiceConversation({ locale, reset }: VoiceConversationProps) {
  const s = getVoiceAssistantStrings(locale);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([]);
  const [sendError, setSendError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [talking, setTalking] = useState(false);

  const conversationRef = useRef<DirectLineConversation | null>(null);
  const resetRef = useRef(reset);
  const nextEntryId = useRef(0);
  /**
   * Direct Line echoes every posted message back over the activity stream,
   * but with a server-assigned `from.id` that never matches what this app
   * sends (verified against the live agent) -- so the echo can't be filtered
   * by id up front, and left unhandled it re-renders the visitor's own
   * question a second time as if the assistant had said it. The exact text
   * of each outgoing message is tracked here; the first incoming activity
   * that echoes it is recognized and dropped, and its `from.id` is
   * remembered so later echoes from that same id are dropped without
   * needing another text match.
   */
  const pendingSentTexts = useRef<string[]>([]);
  const knownSelfIds = useRef<Set<string>>(new Set());
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
    setTalking(false);
    pendingSentTexts.current = [];
    knownSelfIds.current = new Set();

    (async () => {
      const conversation = await startDirectLineConversation(DIRECT_LINE_PROVISION_TOKEN_URL);
      if (cancelled) {
        return;
      }
      conversationRef.current = conversation;
      unsubscribe = subscribeToDirectLineActivities(
        conversation.streamUrl,
        (activity) => {
          if (activity.type !== 'message' || !activity.text) {
            return;
          }

          const fromId = activity.from?.id;
          if (fromId && knownSelfIds.current.has(fromId)) {
            return;
          }

          const pendingIndex = pendingSentTexts.current.indexOf(activity.text);
          if (pendingIndex !== -1) {
            pendingSentTexts.current.splice(pendingIndex, 1);
            if (fromId) {
              knownSelfIds.current.add(fromId);
            }
            return;
          }

          appendEntry('assistant', activity.text);
          resetRef.current();
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
    active: status === 'ready' && talking,
    onFinalTranscript: (text) => {
      if (!text || !conversationRef.current) {
        return;
      }
      appendEntry('visitor', text);
      resetRef.current();
      pendingSentTexts.current = [...pendingSentTexts.current, text].slice(-MAX_PENDING_ECHOES);
      postDirectLineMessage(conversationRef.current, text, LOCALE_TAGS[locale]).catch(() => {
        setSendError(true);
      });
    },
  });

  const handleRetry = () => setReloadKey((key) => key + 1);

  const handleTalkStart = () => setTalking(true);
  const handleTalkEnd = () => setTalking(false);

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

      <button
        type="button"
        className={talking ? styles.talkButtonActive : styles.talkButton}
        aria-pressed={talking}
        aria-label={talking ? s.listening : s.holdToTalk}
        onPointerDown={handleTalkStart}
        onPointerUp={handleTalkEnd}
        onPointerLeave={handleTalkEnd}
        onPointerCancel={handleTalkEnd}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Mic className={styles.micIcon} aria-hidden="true" />
        <span>{talking ? s.listening : s.holdToTalk}</span>
      </button>

      <div className={styles.transcript} aria-live="polite">
        {transcript.length === 0 && !speech.interimTranscript && (
          <p className={styles.transcriptEmpty}>{s.subheading}</p>
        )}
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={entry.speaker === 'visitor' ? styles.visitorLine : styles.assistantLine}
          >
            {entry.speaker === 'assistant' ? renderMarkdown(entry.text, `entry-${entry.id}`) : entry.text}
          </div>
        ))}
        {speech.interimTranscript && (
          <p className={styles.interimLine}>{speech.interimTranscript}</p>
        )}
      </div>
    </div>
  );
}
