import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LocalizedText } from '../i18n/locales';

/**
 * Category colour token key. Accents carry category identity only — never
 * body copy (research.md R10).
 */
export type AccentName = 'emerald' | 'blue' | 'violet' | 'amber' | 'cyan' | 'rose';

export interface TabMeta {
  /** Stable identity. MUST equal the containing folder name. */
  readonly id: string;
  /** EN + HU nav label, owned by the tab itself, not a central string map. */
  readonly label: LocalizedText;
  /** Component reference from lucide-react — not a string name. */
  readonly icon: LucideIcon;
  readonly accent: AccentName;
}

/**
 * The contract every `src/tabs/<name>/` folder satisfies.
 * See specs/001-lobby-kiosk-shell/contracts/tab-module.md
 */
export interface TabModule {
  readonly meta: TabMeta;
  readonly Component: ComponentType;
}
