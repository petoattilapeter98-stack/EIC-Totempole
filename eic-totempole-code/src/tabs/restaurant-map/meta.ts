import { UtensilsCrossed } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

/**
 * Accent is `emerald` for an ACCESSIBILITY reason, not an aesthetic one.
 *
 * `emerald` and `blue` were the two unused accents, but tokens.css annotates
 * `--accent-blue` as 3.27:1 (UI/large only) while `--accent-emerald` is 4.6:1.
 * This feature puts accent colour next to a list of restaurant names, so only
 * emerald clears WCAG AA for normal-size text (Constitution VII).
 *
 * See specs/003-restaurant-map/research.md R9.
 */
export const meta = {
  id: 'restaurant-map',
  label: { en: 'Restaurants', hu: 'Éttermek' },
  icon: UtensilsCrossed,
  accent: 'emerald',
} as const satisfies TabMeta;
