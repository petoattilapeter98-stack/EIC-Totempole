import { useEffect, useRef, useState, type RefObject } from 'react';

import type { Locale } from '../../i18n/locales';
import { COPILOT_STUDIO_EMBED_URL } from './copilotStudioEmbed';
import { getVoiceAssistantStrings } from './strings';
import { meta } from './meta';
import styles from './AgentEmbedContainer.module.css';

export interface AgentEmbedContainerProps {
  readonly locale: Locale;
  /** Exposed so the parent can bridge idle-reset across the iframe boundary (useIframeIdleKeepalive). */
  readonly iframeRef: RefObject<HTMLIFrameElement | null>;
}

type LoadStatus = 'connecting' | 'ready' | 'error';

/** Guarantee 5 (contracts/agent-embed-contract.md): failure must be visible and recoverable. */
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Renders the Copilot Studio agent inline (contracts/agent-embed-contract.md).
 *
 * Full teardown on unmount (guarantee 2) is free: removing the <iframe> from
 * the DOM destroys its entire browsing context -- any listeners, timers, or
 * globals inside it -- without this component needing to know anything about
 * what the embed does internally (research.md R3).
 */
export function AgentEmbedContainer({ locale, iframeRef }: AgentEmbedContainerProps) {
  const s = getVoiceAssistantStrings(locale);
  const [status, setStatus] = useState<LoadStatus>('connecting');
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus('connecting');
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === 'connecting' ? 'error' : current));
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [reloadKey]);

  const handleLoad = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('ready');
  };

  const handleRetry = () => {
    setReloadKey((key) => key + 1);
  };

  return (
    <div className={styles.wrap}>
      {status !== 'ready' && (
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
      )}
      {/*
        Deliberately no `sandbox` attribute (contracts/agent-embed-contract.md
        guarantee 6, spec FR-020, Constitution IV's identity sign-in
        exception v1.1.0): Bot Framework Web Chat, running inside this
        iframe, opens Microsoft's sign-in page via its own window.open() call
        when the bot requires authentication. A sandboxed iframe without
        `allow-popups allow-popups-to-escape-sandbox` would silently block
        that call and make sign-in impossible. This component never calls
        window.open() itself -- the popup, if it happens, originates entirely
        inside the embed's own script (research.md R10).
      */}
      <iframe
        key={reloadKey}
        ref={iframeRef}
        title={meta.label[locale]}
        src={COPILOT_STUDIO_EMBED_URL}
        frameBorder={0}
        className={styles.iframe}
        onLoad={handleLoad}
      />
    </div>
  );
}
