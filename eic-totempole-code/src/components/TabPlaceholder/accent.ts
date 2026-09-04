import type { CSSProperties } from 'react';
import type { AccentName } from '../../types/tab';

/**
 * Maps a category accent to the three custom properties a component needs.
 * Returned as inline style vars so CSS Modules stay static and no component
 * hard-codes a hex value (contracts/ui-structure.md §4).
 */
export function accentVars(accent: AccentName): CSSProperties {
  return {
    '--accent-color': `var(--accent-${accent})`,
    '--accent-soft': `var(--accent-${accent}-soft)`,
    '--accent-border': `var(--accent-${accent}-border)`,
  } as CSSProperties;
}
