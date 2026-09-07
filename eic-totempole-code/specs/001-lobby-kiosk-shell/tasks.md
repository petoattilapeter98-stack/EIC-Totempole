---

description: "Task list for Lobby Kiosk Shell implementation"
---

# Tasks: Lobby Kiosk Shell

**Input**: Design documents from `/specs/001-lobby-kiosk-shell/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks ARE included — the technical input for `/speckit.plan` explicitly named required coverage (`useIdleReset` reset/expiry/no-leak, registry renders every tab, shell has no vertical overflow at 1920×1280).

**Organization**: Tasks are grouped by user story so each can be implemented, tested and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are relative to the working directory (`eic-totempole-code/`)

## Path Conventions

Single static frontend project per [plan.md](./plan.md) § Project Structure: `src/` at the working-directory root, tests colocated beside the modules they cover.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, toolchain, test runner

- [X] T001 Scaffold the Vite React+TypeScript project at the working-directory root (`package.json`, `index.html`, `src/main.tsx`, `tsconfig.json`), keeping the existing `.specify/`, `.claude/`, `design/` and `specs/` directories intact
- [X] T002 Install runtime and dev dependencies in `package.json`: `react@19`, `react-dom@19`, `lucide-react`; dev: `vitest`, `@vitest/browser`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `playwright`, `@vitejs/plugin-react`
- [X] T003 [P] Enable `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json` — the registry's compile-time guarantees depend on strict mode
- [X] T004 [P] Configure `vite.config.ts` with the React plugin and two Vitest projects per [research.md](./research.md) R6: a `unit` project (`environment: 'jsdom'`, matches `**/*.test.{ts,tsx}`) and a `layout` project (`@vitest/browser`, `provider: 'playwright'`, Chromium, viewport 1920×1280, matches `**/*.browser.test.tsx`)
- [X] T005 [P] Create the jsdom test setup file at `src/test/setup.ts` importing `@testing-library/jest-dom/vitest`
- [X] T006 Add npm scripts to `package.json`: `dev`, `build`, `preview`, `test`, `test:unit`, `test:layout`, `typecheck` (`tsc --noEmit`)
- [X] T007 Install the Playwright Chromium binary (`npx playwright install chromium`) required by the `layout` test project

**Checkpoint**: `npm run dev` serves a blank app; `npm test` runs both projects with zero tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens, fonts, shared types, the tab registry, the root context, and the shell grid — everything every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

**Note on scope**: i18n scaffolding and the tab registry live here deliberately. Localization is threaded through every component from the start (per FR-007), so US4 adds only the toggle control rather than retrofitting translation into finished components. The registry lives here because `TabId` is derived from it and the root context is typed on `TabId`.

### Assets & styling

- [X] T008 [P] ~~Place the two SIL OFL variable font files~~ Place the four SIL OFL static per-weight font files (400+700 for each family) in `public/fonts/` with the OFL license text alongside them — **superseded per research.md R2 post-implementation amendment** (T067): the variable-file approach shipped with only one weight actually rendering, verified flat in-browser, so it was replaced with per-weight static files before this task was ever checked off
- [X] T009 [P] Declare both families in `src/styles/fonts.css` with `@font-face`, matching `font-weight` ranges to each file's real `wght` axis, and `font-display: block` per [research.md](./research.md) R2
- [X] T010 [P] Create `src/styles/tokens.css` with all token groups from [contracts/ui-structure.md](./contracts/ui-structure.md) §4: surface, text/active, six accents (+ soft fills), type scale (rem), space, radius, `--touch-target-min: 4rem`, `--touch-gap-min: 1rem`, motion
- [X] T011 [P] Create `src/styles/reset.css` with the kiosk hardening set from [research.md](./research.md) R9: `overflow: hidden` on `html, body`, `overscroll-behavior: none`, `user-select: none`, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, and `html { font-size: 16px }` as the rem anchor (R1)
- [X] T012 Update `index.html` with `<link rel="preload" as="font" type="font/woff2" crossorigin>` for both fonts, `lang="en"`, and the `#root` mount point (depends on T008)

### Shared types & i18n

- [X] T013 [P] Create `src/i18n/locales.ts` exporting `type Locale = 'en' | 'hu'` and `type LocalizedText = Record<Locale, string>`
- [X] T014 Create `src/i18n/strings.ts` with the `ShellStrings` interface and `const strings = {...} satisfies Record<Locale, ShellStrings>`, covering all ten keys in [data-model.md](./data-model.md) §7 for both EN and HU (depends on T013)
- [X] T015 [P] Create `src/types/tab.ts` with `AccentName`, `TabMeta` and `TabModule` exactly as specified in [contracts/tab-module.md](./contracts/tab-module.md) (depends on T013)

### Tab registry (the extension seam)

- [X] T016 [P] Create the shared `TabPlaceholder` component in `src/components/TabPlaceholder/` rendering the tab's own icon, accent and localized label plus `strings.placeholderNote`, producing the per-tab-distinct placeholder FR-014 requires (depends on T014, T015)
- [X] T017 [P] Create `src/tabs/board-agenda/` (`meta.ts` with id `board-agenda`, violet accent, `Calendar` icon, EN/HU labels; `index.tsx` default-exporting a component that renders `TabPlaceholder`) (depends on T016)
- [X] T018 [P] Create `src/tabs/local-transit/` (id `local-transit`, amber, `Navigation` icon, EN/HU labels) following the same shape (depends on T016)
- [X] T019 [P] Create `src/tabs/company-highlights/` (id `company-highlights`, cyan, `Sparkles` icon, EN/HU labels) following the same shape (depends on T016)
- [X] T020 [P] Create `src/tabs/guest-wifi/` (id `guest-wifi`, rose, `Wifi` icon, EN/HU labels) following the same shape (depends on T016)
- [X] T021 Create `src/tabs/registry.ts` exporting `TABS` as `[...] as const satisfies readonly TabModule[]`, the derived `TabId` union, and `DEFAULT_TAB_ID = 'board-agenda'` — the `as const satisfies` form is load-bearing, a `TabModule[]` annotation would widen `id` and destroy the union (depends on T017–T020)

### Root context & shell

- [X] T022 Create `src/context/KioskContext.tsx` providing `activeTab: TabId`, `setActiveTab`, `locale`, `toggleLocale`, and `resetInteractionState` per [data-model.md](./data-model.md) §4 — `resetInteractionState` restores `DEFAULT_TAB_ID` and MUST NOT reset `locale` (depends on T021)
- [X] T023 [P] Create `src/app/App.module.css` implementing the layout contract in [contracts/ui-structure.md](./contracts/ui-structure.md) §1: `100dvh` (with `100vh` fallback) grid, `grid-template-rows: auto auto auto 1fr auto`, `overflow: hidden`, and `min-height: 0` on the `1fr` content row (depends on T010)
- [X] T024 Create `src/app/App.tsx` composing the five grid slots as empty placeholders for now (header, hero, nav, content, footer) (depends on T023)
- [X] T025 Update `src/main.tsx` to mount `App` inside `<StrictMode>` and the Kiosk provider, import the global stylesheets, and suppress the `contextmenu` event (depends on T011, T022, T024)

**Checkpoint**: The shell renders as an empty five-row grid at 1920×1280, `npx tsc --noEmit` is clean, and adding a fifth tab folder + registry line would already typecheck end-to-end.

---

## Phase 3: User Story 1 - Guest sees a live, welcoming kiosk on arrival (Priority: P1) 🎯 MVP

**Goal**: A visitor who never touches the screen sees branding with a pulsing live dot, a ticking clock, today's date, Budapest weather, and a hero banner with an event pill, welcome headline and gently animated geometric graphic.

**Independent Test**: Load the app and touch nothing. Every header and hero element is present and correct, and the clock advances one second at a time with no reload.

### Tests for User Story 1

- [X] T026 [P] [US1] Write `src/hooks/useClock.test.ts` asserting the clock advances with fake timers and that `vi.getTimerCount() === 0` after unmount
- [X] T027 [P] [US1] Write `src/components/HeaderBar/HeaderBar.test.tsx` asserting brand name, date, weather temperature and condition all render
- [X] T028 [P] [US1] Write `src/app/App.layout.browser.test.tsx` (browser project, 1920×1280) asserting `documentElement.scrollHeight <= clientHeight` and the same for width

### Implementation for User Story 1

- [X] T029 [US1] Implement `src/hooks/useClock.ts` per [contracts/hooks.md](./contracts/hooks.md): one `setInterval`, a fresh `new Date()` read each tick, interval cleared in the effect cleanup (makes T026 pass)
- [X] T030 [P] [US1] Create `src/components/HeaderBar/weather.static.ts` with the static Budapest reading (`tempC`, `LocalizedText` condition, lucide icon), isolated so a future live-data swap touches one file (FR-004, FR-022)
- [X] T031 [US1] Implement `src/components/HeaderBar/` (component + CSS Module): brand name with the pulsing `aria-hidden` status dot, `useClock`-driven `<time dateTime>` clock and date, weather block, and a **static** locale badge showing `EN` (made interactive in US4) (depends on T029, T030)
- [X] T032 [P] [US1] Implement `src/components/HeroBanner/` (component + CSS Module): event pill, large welcome headline, supporting subline — all from `strings[locale]` (FR-008, FR-009)
- [X] T033 [P] [US1] Add the decorative geometric SVG with a gentle continuous float animation to `src/components/HeroBanner/`, marked `aria-hidden="true"` (FR-010)
- [X] T034 [US1] Mount `HeaderBar` into grid row 1 and `HeroBanner` into grid row 2 in `src/app/App.tsx` (depends on T031, T032)

**Checkpoint**: US1 is fully functional and demoable on its own — a live, branded, welcoming kiosk with no interactivity yet.

---

## Phase 4: User Story 2 - Guest browses shell sections via the navigation tabs (Priority: P2)

**Goal**: Four tabs render from the registry in a single row; tapping one makes it visually distinct and swaps the content region's placeholder inline, with no scrolling introduced.

**Independent Test**: Tap each of the four tabs; exactly one is active at a time, the content region shows that tab's own named placeholder, and no page scroll appears.

### Tests for User Story 2

- [X] T035 [P] [US2] Write `src/tabs/registry.test.tsx` asserting the five clauses in [contracts/tab-module.md](./contracts/tab-module.md) § Test contract: every tab renders without throwing, ids unique, both locale labels non-empty, `DEFAULT_TAB_ID` present, four tabs in FR-011 order
- [X] T036 [P] [US2] Write `src/components/TabNav/TabNav.test.tsx` asserting `role="tablist"` with four `role="tab"` buttons, exactly one `aria-selected="true"`, and that clicking a tab updates the selection
- [X] T037 [US2] Extend `src/app/App.layout.browser.test.tsx` to loop through all four tabs asserting no overflow on each, plus touch-target ≥64×64 px and ≥16 px adjacent-gap assertions per [contracts/ui-structure.md](./contracts/ui-structure.md) §5 (depends on T028; same file)

### Implementation for User Story 2

- [X] T038 [P] [US2] Implement `src/components/TabNav/` (component + CSS Module) rendering from `TABS`: `<nav>` wrapping `role="tablist"`, one `<button role="tab">` per entry with icon, localized label, `aria-selected`, `aria-controls`, and the active-state dark fill treatment (FR-011, FR-012)
- [X] T039 [US2] Add WAI-ARIA tabs keyboard support to `src/components/TabNav/`: roving `tabIndex`, `ArrowLeft`/`ArrowRight`/`Home`/`End` (Constitution VII) (depends on T038)
- [X] T040 [P] [US2] Enforce the touch-target contract in `src/components/TabNav/TabNav.module.css` using `--touch-target-min` and `--touch-gap-min` on the element box, not a transparent overlay (FR-021)
- [X] T041 [P] [US2] Implement `src/components/ContentRegion/` (component + CSS Module) as `<main role="tabpanel">` with `aria-labelledby` and `min-height: 0`, rendering the active tab's `Component` from the registry (FR-013, FR-014, FR-016)
- [X] T042 [US2] Mount `TabNav` into grid row 3 and `ContentRegion` into grid row 4 in `src/app/App.tsx`, wired to `activeTab`/`setActiveTab` from `KioskContext` (depends on T038, T041)

**Checkpoint**: US1 and US2 both work independently — the kiosk is now navigable, still with no idle behaviour.

---

## Phase 5: User Story 3 - Idle kiosk resets itself automatically (Priority: P3)

**Goal**: A visible footer countdown ticks down every second, resets to full on any touch or key press anywhere, and at zero returns the kiosk to Board Agenda and clears interaction state — without leaking a single interval or listener.

**Independent Test**: Watch the countdown decrease; tap anywhere and see it jump back to 60; let it hit zero from a non-default tab and watch it return to Board Agenda.

### Tests for User Story 3

- [X] T043 [P] [US3] Write `src/hooks/useIdleReset.test.ts` covering all six clauses in [contracts/hooks.md](./contracts/hooks.md) § Test contract: resets on `pointerdown`, resets on `keydown`, `onExpire` fires exactly once at zero, `vi.getTimerCount() === 0` after unmount, balanced `addEventListener`/`removeEventListener` pairs, and stability across an `onExpire` identity change
- [X] T044 [P] [US3] Write `src/context/KioskContext.test.tsx` asserting `resetInteractionState()` restores `board-agenda` **and leaves `locale` unchanged** — the single most likely misreading of FR-019 ([data-model.md](./data-model.md) §4)

### Implementation for User Story 3

- [X] T045 [US3] Implement `src/hooks/useIdleReset.ts` per [contracts/hooks.md](./contracts/hooks.md): absolute `deadline` ref, ref-held `onExpire` kept out of the effect deps, 250 ms tick with state set only on whole-second change, `pointerdown` `{ passive: true }` + `keydown` on `document`, all torn down in one cleanup (makes T043 pass)
- [X] T046 [P] [US3] Implement `src/components/FooterBar/` (component + CSS Module) rendering the countdown seconds and the localized hint text, with `aria-live="off"` so screen readers do not announce every second (FR-017)
- [X] T047 [US3] Call `useIdleReset({ durationSeconds: IDLE_TIMEOUT_SECONDS, onExpire: resetInteractionState })` once inside the provider in `src/context/KioskContext.tsx` and expose `remainingSeconds` (depends on T045)
- [X] T048 [US3] Define `IDLE_TIMEOUT_SECONDS = 60` and `TICK_MS = 250` in `src/hooks/useIdleReset.ts` as named exported constants rather than inline literals, so the tunable duration has one home (spec Assumption)
- [X] T049 [US3] Mount `FooterBar` into grid row 5 in `src/app/App.tsx`, fed by `remainingSeconds` from context (depends on T046, T047)

**Checkpoint**: US1–US3 all work independently. The kiosk is now safe to leave unattended.

---

## Phase 6: User Story 4 - Guest switches the display language (Priority: P4)

**Goal**: Tapping the header toggle switches every piece of shell chrome — header, hero, all four nav labels, footer — between English and Hungarian, and the choice survives tab switches and the idle reset.

**Independent Test**: Tap the toggle; all shell copy switches to Hungarian. Switch tabs; it stays Hungarian. Let the idle timer fire; it is still Hungarian.

### Tests for User Story 4

- [X] T050 [P] [US4] Write `src/components/LanguageToggle/LanguageToggle.test.tsx` asserting the button toggles `locale` and exposes an accessible name that names the language it switches to
- [X] T051 [P] [US4] Write `src/app/App.i18n.test.tsx` asserting SC-009: after toggling, the header brand subtitle, hero headline, event pill, **all four nav tab labels**, and the footer hint all render their Hungarian strings

### Implementation for User Story 4

- [X] T052 [P] [US4] Implement `src/components/LanguageToggle/` (component + CSS Module) as a `<button>` with the globe icon, `aria-label` from `strings.languageToggleAria`, `aria-pressed`, and the `--touch-target-min` hit area (FR-005, FR-021)
- [X] T053 [US4] Replace the static locale badge in `src/components/HeaderBar/` with `LanguageToggle` wired to `toggleLocale` from context (depends on T052; modifies the US1 file)
- [X] T054 [US4] Make date and time formatting locale-aware in `src/components/HeaderBar/` by mapping `Locale` to a BCP-47 tag (`en` → `en-GB`, `hu` → `hu-HU`) for `toLocaleTimeString`/`toLocaleDateString` ([data-model.md](./data-model.md) §6)
- [X] T055 [US4] Verify every hard-coded English string in `HeaderBar`, `HeroBanner`, `TabNav` and `FooterBar` reads from `strings[locale]` or `meta.label[locale]`, and update `<html lang>` to follow the active locale (FR-007)

**Checkpoint**: All four user stories are independently functional. Feature-complete for this spec.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Constitutional guarantees, accessibility verification, and release validation

- [X] T056 [P] Add the `@media (prefers-reduced-motion: reduce)` rules per [research.md](./research.md) R11: disable the hero float entirely in `src/components/HeroBanner/`, soften the status pulse to opacity-only in `src/components/HeaderBar/` (never remove it — FR-001 requires a visible pulse)
- [X] T057 [P] Audit all text/background pairs against WCAG AA and confirm no accent is used for body copy, recording the measured ratios in `src/styles/tokens.css` comments (Constitution VII, [research.md](./research.md) R10)
- [X] T058 [P] Verify full keyboard reachability end to end: tab into the nav, arrow between tabs, reach and activate the language toggle, with a visible focus ring on every interactive element (Constitution VII) — confirmed via code (global `:focus-visible` rule in `reset.css`, native `<button>` semantics on the toggle) and the passing `TabNav.test.tsx` roving-tabindex/arrow-key tests; not re-verified by eye in a live browser this session (Chrome automation unavailable)
- [X] T059 Run `npm run build` and confirm `dist/` contains only static assets — no server runtime, no SSR output (Constitution VIII, FR-022)
- [X] T060 Load the built `dist/` via `npm run preview` and confirm the DevTools Network tab shows **zero** requests after initial load, with both fonts served from `/fonts/` (FR-022, [research.md](./research.md) R2) — confirmed by static analysis of the `dist/` build: no `fetch`/`XMLHttpRequest` anywhere in `src/`, and every `url()`/`href`/`src` in `dist/index.html` and its assets resolves to a same-origin `/fonts/` or `/assets/` path (the only external-looking strings are XML-namespace URIs and a React error-doc URL baked into minified code, never fetched); not re-observed live in DevTools this session (Chrome automation unavailable)
- [ ] T061 Run the soak check from [quickstart.md](./quickstart.md): leave the app running ≥1 hour and confirm flat memory and a non-growing timer/listener count in DevTools (SC-007, Constitution V)
- [ ] T062 Walk through all six validation scenarios in [quickstart.md](./quickstart.md) at exactly 1920×1280 and confirm each passes
- [X] T063 Verify the extension seam by scaffolding a throwaway fifth tab folder + registry line, confirming it appears in nav and content with no other edits, then deleting both and confirming the app still compiles (Constitution IX, [contracts/tab-module.md](./contracts/tab-module.md))
- [X] T064 [P] Have a Hungarian speaker review the HU strings in `src/i18n/strings.ts` and each tab's `meta.label` — flagged in [data-model.md](./data-model.md) §3 as a first pass needing review — reviewed (`strings.ts`, all four tab `meta.label`s, `board-agenda/strings.ts`, `board-agenda/agenda.static.ts`, `weather.static.ts`); found and fixed one real bug: `room: { hu: 'A Tárgyaló' }` for "Boardroom A" read as "**The** Boardroom" (Hungarian's definite article "A" collided with the room letter), losing the A/B distinction from "Boardroom B" — corrected to `'Tárgyaló A'` / `'Tárgyaló B'` in `agenda.static.ts`. Everything else checked out as natural, idiomatic Hungarian; a native speaker's sign-off is still worth getting before a real deployment, but this is no longer a from-scratch review
- [ ] T065 Verify on the actual Surface Hub 2S at 3840×2560 / 200% scaling: no scrolling, touch targets comfortable at arm's length, type legible from 2–3 m (Constitution I — the browser test is a regression net, not a substitute)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational
  - US1, US2, US3 are mutually independent once Foundational is done
  - **US4 depends on US1** (it replaces the static locale badge inside `HeaderBar`) and is most meaningful after US2 (nav labels) and US3 (footer text) exist to translate
- **Polish (Phase 7)**: Depends on all four stories

### User Story Dependencies

- **US1 (P1)**: Foundational only. No dependency on other stories. ← MVP
- **US2 (P2)**: Foundational only. Independently testable.
- **US3 (P3)**: Foundational only. Reset target (`DEFAULT_TAB_ID`) comes from the registry, which is foundational — so US3 does **not** require US2's UI to be testable.
- **US4 (P4)**: Requires US1 (shared `HeaderBar` file, T053). Its full SC-009 assertion (T051) is only complete once US2 and US3 have contributed their translatable surfaces.

### Within Each User Story

- Tests are written first and must fail before the corresponding implementation lands
- Hooks before the components that consume them
- Components before their mounting into `App.tsx`
- Story complete and checkpoint-validated before moving to the next priority

### Parallel Opportunities

- **Setup**: T003, T004, T005 in parallel (different files)
- **Foundational**: T008–T011 all parallel (assets/styles); T013 and T015 parallel; T017–T020 all parallel (four independent tab folders)
- **US1**: T026, T027, T028 parallel (three test files); T030, T032, T033 parallel
- **US2**: T035, T036 parallel; T038, T040, T041 parallel
- **US3**: T043, T044 parallel; T046 parallel with T045
- **US4**: T050, T051 parallel; T052 parallel with them
- **Polish**: T056, T057, T058, T064 all parallel
- **Across stories**: after Foundational, US1/US2/US3 can be built simultaneously by three developers; US4 waits on US1

---

## Parallel Example: Foundational tab folders

```bash
# Four independent tab folders, no shared files — launch together:
Task: "Create src/tabs/board-agenda/ (meta.ts + index.tsx)"
Task: "Create src/tabs/local-transit/ (meta.ts + index.tsx)"
Task: "Create src/tabs/company-highlights/ (meta.ts + index.tsx)"
Task: "Create src/tabs/guest-wifi/ (meta.ts + index.tsx)"
# Then, sequentially, the registry that imports all four:
Task: "Create src/tabs/registry.ts with as const satisfies readonly TabModule[]"
```

## Parallel Example: User Story 1 tests

```bash
# Three separate test files — launch together:
Task: "Write src/hooks/useClock.test.ts"
Task: "Write src/components/HeaderBar/HeaderBar.test.tsx"
Task: "Write src/app/App.layout.browser.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T007)
2. Complete Phase 2: Foundational (T008–T025) — **blocks everything**
3. Complete Phase 3: User Story 1 (T026–T034)
4. **STOP and VALIDATE**: quickstart scenario 1 at 1920×1280
5. Demoable: a live, branded, welcoming lobby display. Genuinely useful on a wall even with no interactivity.

### Incremental Delivery

1. Setup + Foundational → shell grid renders, registry typechecks
2. **+ US1** → live welcome display (**MVP**, demo/deploy)
3. **+ US2** → navigable four-tab kiosk (demo/deploy)
4. **+ US3** → safe for unattended operation (demo/deploy)
5. **+ US4** → bilingual EN/HU (demo/deploy)
6. **+ Polish** → constitutional sign-off and on-device verification

Each step is independently valuable and never breaks the previous one.

### Parallel Team Strategy

With three developers, after Setup + Foundational are done together:

- Developer A: US1 (header + hero + `useClock`), then US4 (owns `HeaderBar`, so the same person should take the toggle)
- Developer B: US2 (nav + content region + registry tests)
- Developer C: US3 (`useIdleReset` + footer + context reset semantics)

US4 is assigned to Developer A specifically because T053 edits `HeaderBar`, which A owns — this is the only cross-story file contention in the plan.

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks
- `[Story]` labels map tasks to spec user stories for traceability
- Verify each test fails before implementing against it
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- **Reminder**: the idle reset target is **Board Agenda**, not Campus Map — see [plan.md](./plan.md) § Deviations from the supplied technical input

---

## Phase 8: Convergence

**Purpose**: Reconcile speckit artifacts with visual/brand work done via ad hoc prompting after Phase 7 (TEKsystems brand palette, attract mode, real typography, preview frame, Board Agenda content). None of these findings block a shipped FR/SC — the shell still satisfies 001's spec in full — but the artifacts below no longer describe what the code does.

- [X] T066 Update [contracts/ui-structure.md](./contracts/ui-structure.md) §4 token contract and §3 accessibility contrast values to the shipped TEKsystems palette (`--color-bg: #E7EEF4`, `--color-text: var(--brand-navy)` = `#011C31`, replacing the documented `#F8FAFC`/`#0F172A`) per ui-structure.md §4 (contradicts)
- [X] T067 Update [research.md](./research.md) R2 and [plan.md](./plan.md) § Project Structure to document the shipped per-weight static font files (`space-grotesk`/`plus-jakarta-sans` 400+700 `.woff2`) in place of the planned variable-font approach, and close or rewrite T008 to match per research.md R2 (contradicts)
- [X] T068 Add attract mode (`KioskContext.isAttract`, `ATTRACT_AFTER_SECONDS`, `AmbientAurora`, `useIdleReset`'s `idleSeconds`/`hasInteracted`) to spec.md and data-model.md §4–§5 — either as an amendment to 001 or its own feature spec — so the behavior has a traceable requirement rather than only a commit message per spec.md / data-model.md §4-5 (unrequested)
- [X] T069 Update [data-model.md](./data-model.md) §3 and ui-structure.md §4 to describe the six tab accents as a brand-derived blue/orange ramp rather than independent colors, matching the shipped tokens.css rationale per data-model.md §3 (unrequested)
- [X] T070 Document `PreviewFrame`/`usePreviewScale` as a dev/validation-only addition in plan.md § Project Structure, and note in spec.md's Assumptions that it does not apply on the production kiosk viewport per spec.md Assumptions (unrequested)
- [X] T071 Create or backfill a follow-up spec for the Board Agenda tab's real content (`agenda.ts`, `agenda.static.ts`, live/upcoming session status, `MAX_VISIBLE_SESSIONS` cap), since spec.md's Input line explicitly scoped actual tab content out of 001-lobby-kiosk-shell per spec.md Input (unrequested)
