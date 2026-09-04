import { Navigation } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

export const meta = {
  id: 'local-transit',
  label: { en: 'Local Transit', hu: 'Helyi Közlekedés' },
  icon: Navigation,
  accent: 'amber',
} as const satisfies TabMeta;
