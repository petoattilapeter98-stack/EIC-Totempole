import { useCallback, useEffect, useRef, useState } from 'react';
import { Grid3x3 } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { accentVars } from '../../components/TabPlaceholder/accent';
import { EnlargedView } from '../../components/EnlargedView/EnlargedView';
import GameBoard from './GameBoard';
import { meta } from './meta';
import { getGameStrings } from './strings';
import styles from './TicTacToe.module.css';

type DisplayState = 'default' | 'enlarged';

/**
 * Tic-Tac-Toe destination.
 *
 * Sixth kiosk tab (FR-028). The default view shows a short introduction and a
 * Play control, like every other tab. Play opens the enlarged game view,
 * rendered via the shared EnlargedView (specs/004-tic-tac-toe/contracts/
 * enlarged-view.md) with `attractExempt` — the one deliberate difference from
 * the restaurant map's expanded state (FR-020): players stop touching the
 * board exactly when they are thinking about their next move, so it must not
 * fade while they look at it.
 *
 * WHY THERE IS NO RESET LOGIC HERE:
 * GameBoard mounts only while `display === 'enlarged'`. Leaving (Close) or
 * the kiosk's idle reset (which unmounts this whole tab via ContentRegion's
 * `key={activeTab}`) unmounts GameBoard, discarding the board along with it.
 * The next Play mounts a fresh `useReducer`, i.e. a fresh EMPTY_BOARD. Adding
 * an explicit reset path would be redundant machinery (research R6, matching
 * the restaurant map's same reasoning).
 *
 * Unlike the restaurant map, EnlargedView is mounted here ONLY while
 * `enlarged` (not in both states): GameBoard's whole purpose is to be
 * remounted fresh on every Play, so E10's "never remount children" concern
 * does not apply to this caller — there is no persistent iframe state to lose.
 */
export default function TicTacToe() {
  const { locale } = useKiosk();
  const s = getGameStrings(locale);

  const [display, setDisplay] = useState<DisplayState>('default');
  const playRef = useRef<HTMLButtonElement | null>(null);
  // Tracks whether the default view should refocus Play on the next render,
  // without making focus a render input (matches the restaurant map's
  // pendingFocus pattern).
  const pendingFocus = useRef<'play' | null>(null);

  useEffect(() => {
    if (pendingFocus.current === 'play') playRef.current?.focus();
    pendingFocus.current = null;
  }, [display]);

  const play = useCallback(() => {
    setDisplay('enlarged');
  }, []);

  const close = useCallback(() => {
    pendingFocus.current = 'play';
    setDisplay('default');
  }, []);

  const isEnlarged = display === 'enlarged';

  return (
    <div className={styles.root} style={accentVars(meta.accent)} data-display={display}>
      {isEnlarged ? (
        <EnlargedView active returnLabel={s.close} onReturn={close} attractExempt>
          <GameBoard />
        </EnlargedView>
      ) : (
        <>
          <Grid3x3 className={styles.illustration} aria-hidden="true" />
          <h2 className={styles.heading}>{s.heading}</h2>
          <p className={styles.intro}>{s.intro}</p>
          <button type="button" ref={playRef} className={styles.play} onClick={play}>
            {s.play}
          </button>
        </>
      )}
    </div>
  );
}
