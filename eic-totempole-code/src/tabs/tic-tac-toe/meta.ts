import { Grid3x3 } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

/**
 * Accent is `blue` — the only accent left unused once the restaurant map
 * claimed `emerald` (specs/003-restaurant-map/research.md R9). `--accent-blue`
 * is annotated 3.27:1 in tokens.css, which clears WCAG AA for UI graphics and
 * large text but not normal-size body copy. This feature only ever puts the
 * accent on the nav icon, a decorative illustration and the return control's
 * icon — never on turn/result text or any other body copy — so it stays
 * within that UI-graphics allowance (Constitution VII).
 *
 * See specs/004-tic-tac-toe/research.md R9.
 */
export const meta = {
  id: 'tic-tac-toe',
  // Hungarian label PENDING NATIVE-SPEAKER REVIEW (spec Assumptions, quickstart
  // §2.5/T050). "Amőba" alone commonly means five-in-a-row on a large grid in
  // Hungarian, so "3×3" is included to say which game this actually is.
  label: { en: 'Tic-Tac-Toe', hu: 'Amőba 3×3' },
  icon: Grid3x3,
  accent: 'blue',
} as const satisfies TabMeta;
