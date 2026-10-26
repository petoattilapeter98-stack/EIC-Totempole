import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Grid3x3 } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import { collapseHeroProps } from '../../components/HeroBanner/collapseHero';
import { accentVars } from '../../components/TabPlaceholder/accent';
import GameBoard from './GameBoard';
import { meta } from './meta';
import { getGameStrings } from './strings';
import styles from './TicTacToe.module.css';

type DisplayState = 'default' | 'enlarged';

/**
 * Tic-Tac-Toe destination.
 *
 * Sixth kiosk tab (FR-028). The default view shows a short introduction and a
 * Play control, like every other tab. Play opens the enlarged game view.
 *
 * "Enlarged" means the content region grows, not an overlay: the game stays in
 * the content region and asks the shell to collapse the Welcome banner
 * (src/components/HeroBanner/collapseHero.ts), so the header, nav and footer
 * stay in place. Amended 2026-10-26 - until then the game used the shared
 * full-viewport EnlargedView, which covered the whole page and did not fit the
 * rest of the design.
 *
 * The request is `attractExempt` (FR-020): players stop touching the board
 * exactly when they are thinking about their next move, so attract mode must
 * neither dim the game nor bring the banner back and shrink the board.
 *
 * WHY THERE IS NO RESET LOGIC HERE:
 * GameBoard mounts only while `display === 'enlarged'`. Leaving (Close) or
 * the kiosk's idle reset (which unmounts this whole tab via ContentRegion's
 * `key={activeTab}`) unmounts GameBoard, discarding the board along with it.
 * The next Play mounts a fresh `useReducer`, i.e. a fresh EMPTY_BOARD. Adding
 * an explicit reset path would be redundant machinery (research R6, matching
 * the restaurant map's same reasoning).
 */
export default function TicTacToe() {
  const { locale } = useKiosk();
  const s = getGameStrings(locale);

  const [display, setDisplay] = useState<DisplayState>('default');
  const playRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Which control to focus after the next display change, without making
  // focus a render input (matches the restaurant map's pendingFocus pattern).
  // Opening focuses Close, because Play has just disappeared from under the
  // keyboard focus (FR-007); closing focuses Play again.
  const pendingFocus = useRef<'play' | 'close' | null>(null);

  useEffect(() => {
    if (pendingFocus.current === 'play') playRef.current?.focus();
    if (pendingFocus.current === 'close') closeRef.current?.focus();
    pendingFocus.current = null;
  }, [display]);

  const play = useCallback(() => {
    pendingFocus.current = 'close';
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
        <div className={styles.gameView} {...collapseHeroProps({ attractExempt: true })}>
          <GameBoard>
            <button ref={closeRef} type="button" className={styles.close} onClick={close}>
              <ArrowLeft className={styles.actionIcon} aria-hidden="true" />
              <span>{s.close}</span>
            </button>
          </GameBoard>
        </div>
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
