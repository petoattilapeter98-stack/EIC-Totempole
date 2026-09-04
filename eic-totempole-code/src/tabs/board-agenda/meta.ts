import { Calendar } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

export const meta = {
  id: 'board-agenda',
  label: { en: 'Board Agenda', hu: 'Testületi Napirend' },
  icon: Calendar,
  accent: 'violet',
} as const satisfies TabMeta;
