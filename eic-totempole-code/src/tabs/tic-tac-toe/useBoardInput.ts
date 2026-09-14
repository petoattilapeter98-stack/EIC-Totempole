import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Bridges touch/pointer/keyboard input to move commits.
 * specs/004-tic-tac-toe/contracts/view-states.md §3 (N1-N6)
 *
 * ONE BOARD-LEVEL POINTERDOWN HANDLER, NOT A PER-CELL ONE
 * ---------------------------------------------------------
 * The multi-touch rule (N2) needs to know, at the moment a pointer touches a
 * cell, whether any OTHER pointer is already down anywhere on the board. If
 * each cell had its own `onPointerDown`, React would call the CELL's handler
 * before the BOARD's (event handlers fire bubbling-phase, innermost first),
 * so a cell handler reading `activePointers` would always see the state from
 * BEFORE the current pointer was recorded — the set would look empty even
 * when it is the second finger down, and N2 would never trigger. Putting the
 * one handler on the board and locating the cell via `closest` avoids that
 * ordering trap entirely.
 *
 * WHY POINTER CAPTURE (N3)
 * -------------------------
 * Without `setPointerCapture`, a finger that slides off the board edge before
 * lifting delivers its `pointerup` to whatever element is now underneath it,
 * not to the board — the id would never be removed from `activePointers`, and
 * every later touch would be silently ignored forever (a Constitution V
 * failure with no operator present to notice). Capturing on `pointerdown` and
 * releasing via the paired listeners (`pointerup`, `pointercancel`,
 * `lostpointercapture`) makes the release unmissable.
 */
export function useBoardInput(dispatchPlace: (index: number) => void) {
  const activePointers = useRef<Set<number>>(new Set());

  const releasePointer = (event: { pointerId: number }) => {
    activePointers.current.delete(event.pointerId);
  };

  const onBoardPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // N1: touch, pen, or primary-button mouse only.
    const accepted =
      event.pointerType === 'touch' || event.pointerType === 'pen' || event.button === 0;
    if (!accepted) return;

    const wasEmpty = activePointers.current.size === 0;
    activePointers.current.add(event.pointerId);

    // N3: capture so this pointer's release is never missed, even off-board.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some environments (older browsers, certain synthetic events) may not
      // support capture; the move-commit logic below does not depend on it
      // succeeding, only the "never lose a release" guarantee does.
    }

    // N2: only the FIRST pointer down on the board (board-scoped, not
    // isPrimary — a hand resting elsewhere on the screen must not block play)
    // may commit a move, and only if it landed on a cell.
    if (!wasEmpty) return;

    const target = event.target as Element;
    const cellEl = target.closest('[data-cell-index]');
    if (!cellEl) return;

    const indexAttr = cellEl.getAttribute('data-cell-index');
    if (indexAttr === null) return;
    dispatchPlace(Number(indexAttr));
  };

  const boardProps = {
    onPointerDown: onBoardPointerDown,
    onPointerUp: releasePointer,
    onPointerCancel: releasePointer,
    onLostPointerCapture: releasePointer,
    // N6: no preventDefault/stopPropagation anywhere in this hook — the event
    // must keep bubbling to `document` so the kiosk's idle countdown restarts
    // (FR-019). N7 (touch-action, user-select) is handled in CSS, not here.
  };

  function cellProps(index: number) {
    return {
      'data-cell-index': index,
      // N4: keyboard Enter/Space and assistive-technology activation dispatch
      // `click` with `detail === 0`; a pointer-originated click has
      // `detail >= 1` and must be ignored here because its `pointerdown`
      // already committed the move above — otherwise a tap would place two
      // marks.
      onClick: (event: { detail: number }) => {
        if (event.detail === 0) {
          dispatchPlace(index);
        }
      },
    };
  }

  return { boardProps, cellProps };
}
