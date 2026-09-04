import { Sparkles } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

// Label follows spec FR-011 ("Company Highlights"), which is authoritative over
// the reference mockup's shortened "Highlights". Resolves analyze finding I1.
export const meta = {
  id: 'company-highlights',
  label: { en: 'Company Highlights', hu: 'Kiemelt Hírek' },
  icon: Sparkles,
  accent: 'cyan',
} as const satisfies TabMeta;
