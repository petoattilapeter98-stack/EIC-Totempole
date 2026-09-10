import { useState } from 'react';
import { Mic } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { accentVars } from '../../components/TabPlaceholder/accent';
import { meta } from './meta';
import { getVoiceAssistantStrings } from './strings';
import { examplePrompts } from './examplePrompts';
import { VoiceConversation } from './VoiceConversation';
import styles from './AgentPanel.module.css';

/** data-model.md AgentPanelState -- idle (prompts + Start) <-> active (voice conversation + End). */
type AgentPanelStatus = 'idle' | 'active';

/**
 * The voice-assistant tab's own view-state machine (spec FR-001, FR-002,
 * FR-004, FR-008, FR-016, FR-019).
 *
 * Re-entering this tab after any active -> idle transition always starts back
 * at 'idle' because this is a fresh component instance every time -- either
 * ContentRegion remounted it (tab switch / idle auto-reset, spec 001) or the
 * visitor tapped End within the same mount. Either way there is no persisted
 * "last state", which is what gives FR-012's clearing guarantee for free
 * (research.md R6).
 */
export function AgentPanel() {
  const { locale, reset } = useKiosk();
  const s = getVoiceAssistantStrings(locale);
  const [status, setStatus] = useState<AgentPanelStatus>('idle');

  return (
    <div className={styles.panel} style={accentVars(meta.accent)}>
      {status === 'idle' ? (
        <div className={styles.idle}>
          <div className={styles.iconWrap}>
            <Mic className={styles.icon} aria-hidden="true" />
          </div>
          <h2 className={styles.heading}>{meta.label[locale]}</h2>
          <p className={styles.subheading}>{s.subheading}</p>

          <div className={styles.prompts}>
            <p className={styles.promptsHeading}>{s.promptsHeading}</p>
            <ul className={styles.promptList}>
              {examplePrompts.map((prompt) => (
                <li key={prompt.domain} className={styles.promptItem}>
                  {prompt.text[locale]}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className={styles.startButton}
            onClick={() => setStatus('active')}
            aria-label={s.startButton}
          >
            <Mic aria-hidden="true" />
            {s.startButton}
          </button>
        </div>
      ) : (
        <div className={styles.active}>
          <div className={styles.conversationWrap}>
            <VoiceConversation locale={locale} reset={reset} />
          </div>
          <button
            type="button"
            className={styles.endButton}
            onClick={() => setStatus('idle')}
            aria-label={s.endButton}
          >
            {s.endButton}
          </button>
        </div>
      )}
    </div>
  );
}
