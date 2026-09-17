import { Mic } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

// 'emerald' was chosen as an AccentName no other tab used at the time
// (board-agenda: violet, guest-wifi: rose).
export const meta = {
  id: 'voice-assistant',
  label: { en: 'Ask Assistant', hu: 'Kérdezzen' },
  icon: Mic,
  accent: 'emerald',
} as const satisfies TabMeta;
