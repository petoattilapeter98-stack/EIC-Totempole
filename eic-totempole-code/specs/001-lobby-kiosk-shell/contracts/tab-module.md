# Contract: Tab Module

**Feature**: `001-lobby-kiosk-shell` | **Consumers**: `TabNav`, `ContentRegion`, `src/tabs/registry.ts`

The contract every `src/tabs/<name>/` folder must satisfy. This is the project's primary extension seam: **adding a tab is one new folder plus one line in the registry — nothing else changes.**

---

## Folder shape

```text
src/tabs/<tab-id>/
├── index.tsx            # default-exports the React component; re-exports meta
├── meta.ts              # the TabMeta object
└── <TabName>.module.css # tab-scoped styles (optional but conventional)
```

`<tab-id>` MUST be kebab-case and MUST equal `meta.id`.

## Type contract

```ts
// src/types/tab.ts
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LocalizedText } from '../i18n/locales';

export type AccentName = 'emerald' | 'blue' | 'violet' | 'amber' | 'cyan' | 'rose';

export interface TabMeta {
  readonly id: string;
  readonly label: LocalizedText;
  readonly icon: LucideIcon;
  readonly accent: AccentName;
}

export interface TabModule {
  readonly meta: TabMeta;
  readonly Component: ComponentType;
}
```

## Registry contract

```ts
// src/tabs/registry.ts
export const TABS = [boardAgenda, localTransit, companyHighlights, guestWifi] as const
  satisfies readonly TabModule[];

export type TabId = (typeof TABS)[number]['meta']['id'];
export const DEFAULT_TAB_ID = 'board-agenda' satisfies TabId;
```

**`as const satisfies readonly TabModule[]` is load-bearing.** `as const` preserves the literal `id` types so `TabId` is a usable union; `satisfies` validates each entry without widening. Writing `const TABS: TabModule[] = [...]` instead widens `id` to `string` and silently destroys every downstream compile-time guarantee.

## Guarantees the registry provides

| Guarantee | Mechanism |
|---|---|
| A malformed tab entry fails at compile time | `satisfies readonly TabModule[]` |
| An unregistered tab id cannot be selected | `setActiveTab(id: TabId)` where `TabId` is derived from `TABS` |
| Nav order is explicit and stable | Array order, not filesystem order |
| Nav and content never disagree about what exists | Both render from `TABS`; no second list exists |

## Rules a tab module MUST follow

1. **No cross-tab imports.** A tab MUST NOT import from another tab's folder. Shared UI belongs in `src/components/`, shared types in `src/types/` (Constitution IX).
2. **No page-level scroll.** The component renders inside the `1fr` content row. It MUST NOT cause `document.documentElement` to overflow. If it needs internal scrolling later, that scroll lives inside its own container (spec FR-016, FR-020).
3. **No props.** `Component` takes none. It reads what it needs from `KioskContext`.
4. **Own its labels.** EN and HU nav labels live in `meta.label`, not a central string map — this is what keeps adding a tab a one-folder change (research R3).
5. **Icon as a component reference**, not a string: `import { Calendar } from 'lucide-react'` then `icon: Calendar`. String-name lookup would defeat tree-shaking and lose type safety.
6. **Removable in isolation.** Deleting the folder and its registry line MUST leave the app compiling and every other tab working.

## Reference implementation (this feature's placeholder)

```ts
// src/tabs/board-agenda/meta.ts
import { Calendar } from 'lucide-react';
import type { TabMeta } from '../../types/tab';

export const meta = {
  id: 'board-agenda',
  label: { en: 'Board Agenda', hu: 'Testületi Napirend' },
  icon: Calendar,
  accent: 'violet',
} as const satisfies TabMeta;
```

```tsx
// src/tabs/board-agenda/index.tsx
import { meta } from './meta';
import { TabPlaceholder } from '../../components/TabPlaceholder';

export { meta };
export default function BoardAgenda() {
  return <TabPlaceholder meta={meta} />;
}
```

`TabPlaceholder` is a shared shell component (not a tab) that renders the tab's own icon, accent and localized label plus `strings.placeholderNote`, producing the **per-tab-distinct** placeholder FR-014 requires. Each real tab replaces its `TabPlaceholder` usage with real content in a later feature; nothing else changes.

## Test contract

`src/tabs/registry.test.tsx` MUST assert:

1. Every entry in `TABS` renders without throwing (spec User Story 2 / required coverage).
2. Every `meta.id` is unique.
3. `meta.label` has a non-empty string for **both** `en` and `hu`.
4. `DEFAULT_TAB_ID` is present in `TABS`.
5. `TABS` has length 4 and is in the FR-011 order.
