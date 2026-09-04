import { Wifi } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

export const meta = {
  id: 'guest-wifi',
  label: { en: 'Guest Wi-Fi', hu: 'Vendég Wi-Fi' },
  icon: Wifi,
  accent: 'rose',
} as const satisfies TabMeta;
