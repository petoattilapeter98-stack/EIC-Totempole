import { useEffect, useRef, type ReactNode } from 'react';
import { Minimize2 } from 'lucide-react';

import styles from './EnlargedView.module.css';

export interface EnlargedViewProps {
  /**
   * Whether the view is enlarged. The component is rendered in BOTH states so
   * its children keep their position in the React tree — see E10 below.
   */
  readonly active: boolean;
  /** Visible text and accessible name of the return control. Already localized by the caller. */
  readonly returnLabel: string;
  /** Called when the return control is activated. The caller switches its own state back. */
  readonly onReturn: () => void;
  /** Opt out of attract-mode dimming while active. Default false. */
  readonly attractExempt?: boolean | undefined;
  /** Caller-owned layout class for the panel's content area. */
  readonly className?: string | undefined;
  /** The caller's enlarged content. The caller's own data attributes stay on its own elements. */
  readonly children: ReactNode;
}

/**
 * Shared full-viewport capability.
 * specs/004-tic-tac-toe/contracts/enlarged-view.md
 *
 * Two callers today: the restaurant map's expanded state and the Tic-Tac-Toe
 * game view. Both need a full-viewport panel with a persistent return control
 * in the same place, and both need the shell to raise them above the footer
 * and (optionally) hold them at full opacity through attract mode. Neither of
 * those is achievable from inside a tab module — see research R1, R2 in
 * specs/004-tic-tac-toe/research.md — so this component renders the data
 * attributes the shell's two `:has()` rules key on (§3 of the contract).
 *
 * RULE E10 — WHY THIS RENDERS IN BOTH STATES, NOT JUST WHEN ACTIVE:
 * Mounting this component conditionally (`{active && <EnlargedView>...}`)
 * would move its children to a new parent on every activation, and React
 * would then remount them. For the restaurant map that means the map's
 * <iframe> reloads on every expand and collapse — losing the visitor's pan
 * and zoom position and restarting the 5s load race, which breaks 003 FR-010
 * and FR-013. So this component always renders the same wrapper element;
 * inactive, it is `display: contents` and carries no attributes and no return
 * control, adding no box to the caller's layout.
 *
 * RULE E3 — WHY THE ATTRACT EXEMPTION IS ATTRIBUTE PRESENCE, NOT REGISTERED
 * STATE: an earlier design considered registering the exemption in
 * KioskContext via an effect with a cleanup function. That adds an ownership
 * token whose leak would silently pin the kiosk out of attract mode forever
 * with nothing to show it. Deriving the exemption from whether
 * `data-attract-exempt` is currently in the DOM means it can never outlive the
 * element carrying it — the moment this component unmounts or `active`
 * becomes false, the exemption is gone in the same frame, with no state to
 * leak (Constitution V).
 */
export function EnlargedView({
  active,
  returnLabel,
  onReturn,
  attractExempt,
  className,
  children,
}: EnlargedViewProps) {
  const returnRef = useRef<HTMLButtonElement | null>(null);

  // Focus moves to the return control whenever the view becomes active,
  // whether mounted already active or transitioning from inactive (E7) — a
  // keyboard or screen-reader user must never be left behind the now-covered
  // chrome. Deliberately NOT a focus trap (E8): a trap would make this read as
  // a modal in all but name.
  useEffect(() => {
    if (active) {
      returnRef.current?.focus();
    }
  }, [active]);

  return (
    <div
      className={`${styles.panel} ${active ? (className ?? '') : styles.inactive}`}
      {...(active ? { 'data-enlarged-view': '' } : {})}
      {...(active && attractExempt ? { 'data-attract-exempt': '' } : {})}
    >
      {children}

      {active ? (
        <button
          ref={returnRef}
          type="button"
          className={styles.returnControl}
          onClick={onReturn}
          aria-label={returnLabel}
        >
          <Minimize2 className={styles.returnIcon} aria-hidden="true" />
          <span className={styles.returnLabel}>{returnLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
