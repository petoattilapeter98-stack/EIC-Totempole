import { Mic } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

// 'emerald' is the one AccentName not yet used by another tab (board-agenda:
// violet, company-highlights: cyan, guest-wifi: rose, local-transit: amber).
export const meta = {
  id: 'voice-assistant',
  label: { en: 'Ask Assistant', hu: 'Kérdezzen' },
  icon: Mic,
  accent: 'emerald',
} as const satisfies TabMeta;
