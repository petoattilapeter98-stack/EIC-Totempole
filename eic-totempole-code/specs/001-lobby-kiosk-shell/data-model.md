# Phase 1 Data Model: Lobby Kiosk Shell

**Feature**: `001-lobby-kiosk-shell` | **Date**: 2026-09-04 | **Plan**: [plan.md](./plan.md)

There is no persistence layer in this feature — nothing is written to a database, `localStorage`, cookies, or a backend. "Data model" here means the in-memory state shapes and the compile-time types that enforce the spec's invariants.

---

## 1. `Locale`

| Field | Type | Notes |
|---|---|---|
| — | `'en' \| 'hu'` | Closed union. Default `'en'`. |

```ts
export type Locale = 'en' | 'hu';
export type LocalizedText = Record<Locale, string>;
```

**Invariant**: `LocalizedText` being `Record<Locale, string>` means a value supplying only `en` fails to compile. Adding a third locale later becomes a compile error at every `LocalizedText` literal — intentional, so no string can be silently left untranslated.

Maps to spec **FR-005**, **FR-006**, **FR-007** and the **Language Preference** entity.

---

## 2. `TabMeta` and `TabModule`

The contract every `src/tabs/<name>/` folder satisfies. Full contract in [contracts/tab-module.md](./contracts/tab-module.md).

| Field | Type | Notes |
|---|---|---|
| `meta.id` | `string` (literal, via `as const`) | Stable identity; equals the folder name. Becomes a member of `TabId`. |
| `meta.label` | `LocalizedText` | EN + HU nav label. Lives in the tab folder, not a central map (research R3). |
| `meta.icon` | `LucideIcon` | Component reference from `lucide-react`, not a string name. |
| `meta.accent` | `AccentName` | Category colour token key: `'emerald' \| 'blue' \| 'violet' \| 'amber' \| 'cyan' \| 'rose'`. |
| `Component` | `ComponentType` | Default export rendered by the content region. Takes no props. |

```ts
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

**Validation rules**:
- `meta.id` MUST equal the containing folder name (asserted in `registry.test.tsx`).
- `Component` MUST render without props and MUST NOT introduce its own page-level scroll (spec FR-016, FR-020).
- A tab MUST NOT import from another tab's folder (Constitution IX).

---

## 3. `TabId` (derived) and the registry

```ts
export const TABS = [boardAgenda, localTransit, companyHighlights, guestWifi] as const
  satisfies readonly TabModule[];

export type TabId = (typeof TABS)[number]['meta']['id'];
// → 'board-agenda' | 'local-transit' | 'company-highlights' | 'guest-wifi'

export const DEFAULT_TAB_ID: TabId = 'board-agenda';
```

| Registered tab | `id` | Accent | EN label | HU label |
|---|---|---|---|---|
| Board Agenda | `board-agenda` | violet | Board Agenda | Testületi Napirend |
| Local Transit | `local-transit` | amber | Local Transit | Helyi Közlekedés |
| Company Highlights | `company-highlights` | cyan | Company Highlights | Kiemelt Hírek |
| Guest Wi-Fi | `guest-wifi` | rose | Guest Wi-Fi | Vendég Wi-Fi |

**Invariants**:
- **Exactly four tabs, in this order** (spec FR-011). Nav order is registry array order — never filesystem order.
- `DEFAULT_TAB_ID` is `'board-agenda'` (spec **FR-015**), and is also the idle-reset target (spec **FR-019**).
- Because `TabId` is derived from `TABS`, any id not in the registry — including `'campus-map'` from the technical input — is a **compile error**, not a runtime blank panel.

> **HU labels above are a first pass and should be reviewed by a Hungarian speaker before sign-off.** They are content, not structure — correcting one is a one-line edit inside the owning tab folder.

> **Accent colors amendment (2026-09-06)**: the `Accent` column above (id → accent name) is still accurate, but the colors each name resolves to were revised for the TEKsystems brand — they're no longer six independent colors but a blue/orange ramp derived from the brand palette. See [contracts/ui-structure.md](./contracts/ui-structure.md) §4a for the full rationale; `src/styles/tokens.css` is the source of truth for values.

---

## 4. `KioskState` (context value)

The single context provider at the app root. Full contract in [contracts/app-context.md](./contracts/app-context.md).

| Field | Type | Initial | Notes |
|---|---|---|---|
| `activeTab` | `TabId` | `DEFAULT_TAB_ID` | Exactly one, always set — never null (spec FR-012). |
| `setActiveTab` | `(id: TabId) => void` | — | The only mutator; stable identity. |
| `locale` | `Locale` | `'en'` | Spec FR-005/FR-006. |
| `toggleLocale` | `() => void` | — | Flips `en` ↔ `hu`. |
| `resetInteractionState` | `() => void` | — | Idle-reset entry point (spec FR-019). |
| `isAttract` | `boolean` | `true` | **Added 2026-09-06 (backfilled).** True once ATTRACT_AFTER_SECONDS have passed with no real interaction, or before the first interaction since load (spec FR-023–FR-026, User Story 5). Derived from `useIdleReset`'s monotonic `idleSeconds`/`hasInteracted`, not from `remainingSeconds` — see `IdleResetState` below for why. |

**State transitions**:

| Trigger | `activeTab` | `locale` | Notes |
|---|---|---|---|
| Initial mount | → `board-agenda` | → `en` | FR-015 |
| Tab tapped | → tapped `TabId` | unchanged | FR-013; inline, no navigation |
| Language toggled | unchanged | flips | FR-006: survives tab switches |
| Idle countdown hits 0 | → `board-agenda` | **unchanged** | FR-019 + spec Assumption: locale is a display setting, not visitor-entered data |
| Any interaction | unchanged | unchanged | Only resets the countdown deadline (FR-018) |

| Trigger | `isAttract` | Notes |
|---|---|---|
| Initial mount / power-cycle | `true` | FR-023: attract is the resting state, not one reached only after prior use |
| Any `pointerdown`/`keydown` | → `false` | FR-025 |
| ATTRACT_AFTER_SECONDS since last real interaction | → `true` | FR-023 |
| Idle countdown hits 0 (auto-reset fires) | **unchanged** | FR-026: an auto-reset is not a visitor interaction, so it must not exit attract |

**Critical invariant**: `resetInteractionState()` MUST NOT reset `locale`. This is the single most likely implementation error in this feature — the phrase "clears any entered data" in FR-019 reads as "reset everything", but the spec's Assumptions section explicitly excludes locale. Asserted directly in `KioskContext.test.tsx`.

**Extension point**: `resetInteractionState()` currently only restores the default tab, because this feature has no forms. Later features with visitor input (e.g. a check-in flow) register their clearing behaviour here rather than adding a second reset mechanism.

---

## 5. `IdleResetState` (hook-internal)

Returned by `useIdleReset`. Full contract in [contracts/hooks.md](./contracts/hooks.md).

| Field | Type | Notes |
|---|---|---|
| `remainingSeconds` | `number` | Integer, `0 … durationSeconds`. Rendered by the footer (spec FR-017). |
| `idleSeconds` | `number` | **Added 2026-09-06 (backfilled).** Whole seconds since the last real `pointerdown`/`keydown`, monotonic — unlike `remainingSeconds` it keeps climbing past an expiry instead of restarting, because an auto-reset firing is not a person touching the kiosk. Feeds `KioskState.isAttract` (spec FR-023, FR-026). |
| `hasInteracted` | `boolean` | **Added 2026-09-06 (backfilled).** False from mount until the first real interaction; latches `true` thereafter. Lets the shell start in attract mode from boot (spec FR-023) rather than only after one full idle period has elapsed. |
| `reset` | `() => void` | **Added 2026-09-06 (backfilled).** Manual reset, exposed for tests and future programmatic use. |

Internal (never rendered, never in React state):

| Value | Type | Notes |
|---|---|---|
| `deadlineRef` | `MutableRefObject<number>` | Absolute epoch ms. Interaction rewrites this; no re-subscription (research R4). |
| `onExpireRef` | `MutableRefObject<() => void>` | Callback held in a ref so the effect never re-runs on identity change. |
| `lastInteractionRef` | `MutableRefObject<number>` | **Added 2026-09-06 (backfilled).** Absolute epoch ms of the last real interaction. Deliberately separate from `deadlineRef`: the deadline restarts itself on every auto-reset expiry, but `idleSeconds` must keep accumulating until a person actually touches the screen — this is what makes attract mode survive an auto-reset (FR-026). |

**Constants**: `IDLE_TIMEOUT_SECONDS = 60` (spec Assumption: matches the reference mockup; tunable), `TICK_MS = 250`.

**Invariants**:
- `remainingSeconds` never goes negative and never exceeds `durationSeconds`.
- State is set **only** when the integer second changes — never once per tick.
- No value accumulates across ticks (Constitution V: no unbounded state growth).

---

## 6. `ClockReading` (hook-internal)

Returned by `useClock`.

| Field | Type | Notes |
|---|---|---|
| `now` | `Date` | Re-read fresh each tick, never derived by arithmetic from the previous value (research R4). |

Formatting is the consumer's concern: `HeaderBar` renders `toLocaleTimeString` / `toLocaleDateString` with the active `locale` mapped to a BCP-47 tag (`en` → `en-GB`, `hu` → `hu-HU`) so the date localizes with the toggle (FR-007). Satisfies spec **FR-002**, **FR-003**, **SC-002**.

---

## 7. `ShellStrings`

Chrome copy not owned by any tab, in `src/i18n/strings.ts` as `satisfies Record<Locale, ShellStrings>`.

| Key | Purpose | Spec |
|---|---|---|
| `brandName` | "TEKsystems Budapest" | FR-001 |
| `brandSubtitle` | Kiosk descriptor under the brand | FR-001 |
| `eventPill` | Current event name | FR-008 |
| `welcomeHeadline` | Large welcome headline | FR-009 |
| `welcomeSubline` | Supporting hero sentence | FR-009 |
| `weatherCity` | "Budapest" | FR-004 |
| `footerHint` | "Touch a tab to switch view" | FR-017 |
| `footerResetLabel` | Countdown label around the seconds value | FR-017 |
| `languageToggleAria` | Accessible name for the toggle | Constitution VII |
| `placeholderNote` | Shared "content coming soon" line used by tab placeholders | FR-014 |

**Invariant**: `ShellStrings` is one interface applied to both locales, so a key added to `en` but not `hu` fails to compile.

**Note on `placeholderNote`**: per spec FR-014 the placeholder text is *not required* to translate. It lives here for convenience and consistency, and each tab supplies its own distinguishing title, so the rendered placeholder is unique per tab as FR-014 requires.

---

## 8. Static display data

Values that will later come from a service but are local constants now (spec **FR-022** — no network calls).

| Value | Shape | Location | Future |
|---|---|---|---|
| Weather | `{ tempC: number; condition: LocalizedText; icon: LucideIcon }` | `src/components/HeaderBar/weather.static.ts` | Replaced by a backend-proxied call (Constitution VI: no client-side credentials) |
| Event name | `ShellStrings['eventPill']` | `src/i18n/strings.ts` | Replaced by an events feed |

Both are isolated to a single module each so the swap to live data touches one file and no component logic.

---

## Requirements coverage

| Entity / type | Spec requirements |
|---|---|
| `Locale`, `LocalizedText`, `ShellStrings` | FR-005, FR-006, FR-007, SC-009 |
| `TabMeta`, `TabModule`, `TABS`, `TabId` | FR-011, FR-012, FR-013, FR-014, FR-015 |
| `KioskState` | FR-006, FR-012, FR-013, FR-015, FR-019 |
| `IdleResetState` | FR-017, FR-018, FR-019, SC-005, SC-006 |
| `ClockReading` | FR-002, FR-003, SC-002 |
| Static display data | FR-004, FR-008, FR-022 |
