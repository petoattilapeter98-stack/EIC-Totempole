import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useIdleReset, IDLE_TIMEOUT_SECONDS } from '../hooks/useIdleReset';
import { DEFAULT_LOCALE, nextLocale, type Locale } from '../i18n/locales';
import { DEFAULT_TAB_ID, type TabId } from '../tabs/registry';

/**
 * Seconds of no interaction before the shell drifts into attract mode.
 *
 * Shorter than the auto-reset so the kiosk becomes eye-catching while a visitor
 * is still approaching, rather than only after it has given up on them.
 */
export const ATTRACT_AFTER_SECONDS = 30;

export interface KioskState {
  readonly activeTab: TabId;
  readonly setActiveTab: (id: TabId) => void;
  readonly locale: Locale;
  readonly toggleLocale: () => void;
  readonly resetInteractionState: () => void;
  readonly remainingSeconds: number;

  /**
   * True once nobody has touched the kiosk for ATTRACT_AFTER_SECONDS.
   *
   * Derived from the monotonic idle clock rather than the countdown, so it
   * stays on across auto-resets - an auto-reset is the kiosk tidying up after
   * itself, not a person arriving.
   */
  readonly isAttract: boolean;
}

const KioskContext = createContext<KioskState | null>(null);

interface KioskProviderProps {
  readonly children: ReactNode;
  readonly idleTimeoutSeconds?: number;
  /** Overridable so tests can reach attract mode without waiting 30s. */
  readonly attractAfterSeconds?: number;
}

/**
 * The single context provider at the app root.
 *
 * `useIdleReset` is called ONCE here rather than per component: one interval for
 * the whole app, and "any touch anywhere resets it" (FR-018) falls out of the
 * document-level listeners instead of prop-drilled handlers on every element.
 */
export function KioskProvider({
  children,
  idleTimeoutSeconds = IDLE_TIMEOUT_SECONDS,
  attractAfterSeconds = ATTRACT_AFTER_SECONDS,
}: KioskProviderProps) {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB_ID);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  const toggleLocale = useCallback(() => {
    setLocale((current) => nextLocale(current));
  }, []);

  // Keep <html lang> in step with the displayed language so assistive tech
  // announces the copy with the right pronunciation (spec FR-007).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  /**
   * Idle auto-reset target (spec FR-019).
   *
   * Returns to Board Agenda and clears transient interaction state. It MUST NOT
   * reset `locale`: per the spec's Assumptions, the language selection is a
   * display setting, not visitor-entered data, so it survives the reset. This is
   * the single most likely misreading of FR-019's "clears any entered data" —
   * asserted directly in KioskContext.test.tsx.
   *
   * Extension point: later features with visitor input (a check-in form, say)
   * register their clearing behaviour here rather than adding a second reset
   * mechanism.
   */
  const resetInteractionState = useCallback(() => {
    setActiveTab(DEFAULT_TAB_ID);
  }, []);

  const { remainingSeconds, idleSeconds, hasInteracted } = useIdleReset({
    durationSeconds: idleTimeoutSeconds,
    onExpire: resetInteractionState,
  });

  /**
   * Attract is the kiosk's RESTING state, not a state it eventually decays
   * into. It is on from boot and only ever switched off by a person: showing
   * crisp UI to an empty lobby after a power cycle or reload would waste the
   * exact moment the display is most likely to be seen from across the room.
   */
  const isAttract = !hasInteracted || idleSeconds >= attractAfterSeconds;

  const value = useMemo<KioskState>(
    () => ({
      activeTab,
      setActiveTab,
      locale,
      toggleLocale,
      resetInteractionState,
      remainingSeconds,
      isAttract,
    }),
    [activeTab, locale, toggleLocale, resetInteractionState, remainingSeconds, isAttract],
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk(): KioskState {
  const ctx = useContext(KioskContext);
  if (!ctx) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return ctx;
}
