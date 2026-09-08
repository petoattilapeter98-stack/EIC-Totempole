---

description: "Task list for the Restaurant Map feature"
---

# Tasks: Restaurant Map

**Input**: Design documents from `/specs/003-restaurant-map/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The design documents specify test obligations explicitly — see [contracts/view-states.md](contracts/view-states.md) §4, the validation rules in [data-model.md](data-model.md) §1, and [quickstart.md](quickstart.md) §1.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file it touches

## Path Conventions

Single static SPA at the repository root. Feature code lives in `src/tabs/restaurant-map/`; tests sit
beside the code they cover (`*.test.ts[x]` for the `unit` project, `*.browser.test.tsx` for the
`layout` project), per the existing convention in `src/`.

## 🖐 Manual tasks

Some tasks cannot be automated — the map frame is cross-origin and opaque, and the pins live in
Google rather than the repo. These are marked 🖐 and are **not optional**: they cover FR-008
(the kiosk cannot be escaped), FR-007/FR-027 (all pins framed), and FR-023 (list/pin parity), which
are among the highest-consequence requirements in the feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies verified and the external map asset provisioned, so nothing later blocks on them.

- [X] T001 Run `npm install` and confirm `UtensilsCrossed` is exported by the pinned lucide-react in `package.json`; if absent, choose `Utensils` or `MapPin` and record the substitution in `specs/003-restaurant-map/research.md` R9
- [ ] T002 🖐 Create the Google My Maps map per `specs/003-restaurant-map/contracts/curated-data.md` §4: pin at most 8 restaurants, set each pin's number, set sharing to public/unlisted, save the default view, and record the `mid` and owning account
- [X] T003 [P] Create the feature folder `src/tabs/restaurant-map/` matching the tree in `specs/003-restaurant-map/plan.md`

**Checkpoint**: Dependencies confirmed and the map asset exists with a recorded `mid`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The tab must exist, render, and be reachable from the nav before any story can be demonstrated. The curated data serves both US1 and US3, so it lands here rather than in either story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Replace `grid-template-columns: repeat(4, 1fr)` with `grid-auto-flow: column; grid-auto-columns: 1fr` in `src/components/TabNav/TabNav.module.css` so the column count derives from the registry (research R7) — without this the fifth tab breaks the no-scroll guarantee
- [X] T005 [P] Create `src/tabs/restaurant-map/meta.ts` with `id: 'restaurant-map'`, EN/HU labels `{ en: 'Restaurants', hu: 'Éttermek' }`, the icon from T001, and `accent: 'emerald'` (research R9 — emerald is the only unused accent meeting AA for text)
- [X] T006 [P] Create `src/tabs/restaurant-map/strings.ts` with EN/HU copy for the list heading, expand/return labels, iframe title, loading text, and fallback message, typed as `LocalizedText` (FR-018)
- [X] T007 [P] Create `src/tabs/restaurant-map/restaurants.static.ts` defining the `RestaurantPlace` type and the frozen `RESTAURANTS` array per `specs/003-restaurant-map/data-model.md` §1, plus the constants from §4 (`MAP_EMBED_URL`, `MAP_LOAD_TIMEOUT_MS`, `MAX_MAP_SESSION_SECONDS`, `MAP_FOCUS_POLL_MS`, `MAX_RESTAURANTS`)
- [X] T008 Write `src/tabs/restaurant-map/restaurants.test.ts` asserting validation rules V1–V7 from `specs/003-restaurant-map/data-model.md` §1 (cap of 8, numbers exactly `1..n`, unique names, both address locales, `walkMinutes` present and positive, frozen array)
- [X] T009 Create `src/tabs/restaurant-map/RestaurantMap.tsx` and `src/tabs/restaurant-map/index.tsx` as a minimal rendering shell that re-exports `meta`, so the tab mounts before any real content exists
- [X] T010 Add the `restaurant-map` entry to the `TABS` array in `src/tabs/registry.ts` (the single sanctioned extension point — no other shared file changes)
- [X] T011 Assert the nav renders five tabs at 1920x1280 with no page overflow and each tab meeting the 64px / 16px rule — implemented in `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx` rather than `src/app/App.layout.browser.test.tsx`, so the assertion lives with the feature that needed it and is removed with the folder (Constitution IX). The existing App layout test already loops the registry, so five tabs are covered there too.

**Checkpoint**: A fifth nav entry exists, opens a mounted tab, and the curated data is validated. User story work can begin.

---

## Phase 3: User Story 1 - A visitor finds nearby restaurants from the lobby screen (Priority: P1) 🎯 MVP

**Goal**: One tap from the main screen shows a map with every curated restaurant pinned and numbered, beside a numbered list naming each one and its walking time.

**Independent Test**: Tap the Restaurants nav entry and confirm the map view appears in place, shows a numbered pin per curated restaurant, and names every one in the companion list with zero further interaction.

### Tests for User Story 1

- [X] T012 [P] [US1] Write `src/tabs/restaurant-map/RestaurantMap.test.tsx` covering the default state: one list row per curated restaurant, numbers matching the data, walking time rendered, and all copy switching between EN and HU (FR-006, FR-018, FR-038)
- [X] T013 [P] [US1] Write `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx` asserting no page scroll at 1920x1280 with 8 entries at worst-case Hungarian name length, and that every list row occupies a single line (FR-009, FR-038, SC-004, SC-016)

### Implementation for User Story 1

- [X] T014 [P] [US1] Create `src/tabs/restaurant-map/MapEmbed.tsx` rendering the iframe exactly per `specs/003-restaurant-map/contracts/map-embed.md` §1 — `sandbox="allow-scripts allow-same-origin"`, localized `title`, `loading="eager"`, `referrerpolicy` — with a comment stating the sandbox value is a security boundary (FR-008)
- [X] T015 [P] [US1] Create `src/tabs/restaurant-map/RestaurantList.tsx` rendering numbered single-line rows of name + walking time from `RESTAURANTS`, with an `addresses` prop for the US3 fallback to reuse the same component (FR-006, FR-038, research R10)
- [X] T016 [US1] Compose the default state in `src/tabs/restaurant-map/RestaurantMap.tsx` — map box plus companion list — depends on T014 and T015
- [X] T017 [US1] Create `src/tabs/restaurant-map/RestaurantMap.module.css` with the default-state layout, using `min-height: 0` on flexible children so the content region cannot overflow (Principle II)
- [X] T018 [US1] Add accessibility in `src/tabs/restaurant-map/RestaurantMap.tsx` and `RestaurantList.tsx`: localized iframe title, list semantics exposing names as real text, and AA contrast — the embed's pins must not be relied on for any accessible name (FR-019, FR-030)
- [ ] T019 [US1] 🖐 Run `specs/003-restaurant-map/quickstart.md` §2.1 and §2.2 — confirm no affordance in the embed escapes the kiosk (SC-006, 0 of 20 attempts) and that all pins sit inside the initial framing (SC-003)

**Checkpoint**: User Story 1 is fully functional and demoable on its own. This is the MVP.

---

## Phase 4: User Story 2 - A visitor explores the map by touch and it recovers on its own (Priority: P2)

**Goal**: Touch pan/zoom, an expand-to-fullscreen state with a persistent way back, and self-recovery to a clean view when the visitor leaves.

**Independent Test**: Expand the map, pan away from the initial framing, stop touching the screen, wait out the idle period, and confirm the kiosk returns to its default destination and that re-entry shows the collapsed default state at the original framing.

### Tests for User Story 2

- [X] T020 [P] [US2] Extend `src/tabs/restaurant-map/RestaurantMap.test.tsx` with expand/collapse transitions and focus movement — focus to the return control on expand, back to the expand control on collapse, and **no focus trap** (contract rules S1, S6, S7)
- [X] T021 [P] [US2] Write `src/tabs/restaurant-map/useMapActivity.test.ts` using fake timers and a stubbed `document.activeElement`: focus extends the idle deadline, the 10-minute ceiling stops extension, unmount clears the interval, and repeated mount/unmount accumulates nothing (contract rules A1–A5, FR-012, FR-036)
- [X] T022 [P] [US2] Extend `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx` with the expanded state: no page scroll, and both expand and return controls meeting 64px / 16px (contract rules S4, S8, SC-009)

### Implementation for User Story 2

- [X] T023 [P] [US2] Create `src/tabs/restaurant-map/useMapActivity.ts` implementing the focus-transfer poll with the `MAX_MAP_SESSION_SECONDS` ceiling per `specs/003-restaurant-map/contracts/view-states.md` §2 — one interval per mount, cleared on unmount, signalling only through the public `useKiosk()` surface (research R3, FR-036)
- [X] T024 [US2] Add the `display` state and the expand/return controls to `src/tabs/restaurant-map/RestaurantMap.tsx`, including focus movement on both transitions (FR-024, FR-025, FR-026)
- [X] T025 [US2] Add the expanded-state rules to `src/tabs/restaurant-map/RestaurantMap.module.css` using `position: fixed; inset: 0` — no portal and no `role="dialog"`, since both would make it a modal (Principle IV, contract rule S2)
- [X] T026 [US2] Wire `useMapActivity` into `src/tabs/restaurant-map/RestaurantMap.tsx`, passing the iframe ref — depends on T023 and T024
- [ ] T027 [US2] 🖐 Run `specs/003-restaurant-map/quickstart.md` §2.5 — pan continuously for 90s and confirm no reset (this is the scenario the bridge exists for), then confirm the ceiling resets, idle reset collapses the expanded state, and the map dims with the chrome in attract mode with no exemption (FR-011, FR-035, FR-036, SC-017)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - The screen stays useful when the map cannot load (Priority: P3)

**Goal**: When the map cannot load, the screen shows a readable list of restaurant names and addresses instead of a broken frame or an endless spinner.

**Independent Test**: Block network access to Google, open the map, and confirm that within 5 seconds the view shows every restaurant's name and address with a localized explanation — no raw provider error, no empty frame.

### Tests for User Story 3

- [X] T028 [P] [US3] Extend `src/tabs/restaurant-map/RestaurantMap.test.tsx` with the load race: `loading → ready` on iframe load, `loading → failed` when the 5s timer wins, immediate `failed` when `navigator.onLine` is false, and the timeout cleared on both load and unmount (`contracts/map-embed.md` §3, FR-013, FR-014)
- [X] T029 [P] [US3] Extend `src/tabs/restaurant-map/RestaurantMap.test.tsx` asserting the fallback lists name **and** address for 100% of curated restaurants with a localized explanation, in both EN and HU (FR-013, SC-005)
- [X] T030 [P] [US3] Extend `src/tabs/restaurant-map/RestaurantMap.browser.test.tsx` asserting the fallback does not scroll in **either** display state — a visitor can expand before the race resolves (research R10, spec edge case)

### Implementation for User Story 3

- [X] T031 [US3] Add the `mapStatus` state machine to `src/tabs/restaurant-map/RestaurantMap.tsx` per `specs/003-restaurant-map/data-model.md` §3 — terminal within a mount, with no retry timer (Principle V)
- [X] T032 [US3] Add the bounded loading state to `src/tabs/restaurant-map/RestaurantMap.tsx` so the region is never empty and never loads indefinitely (FR-014)
- [X] T033 [US3] Render the fallback in `src/tabs/restaurant-map/RestaurantMap.tsx` by reusing `RestaurantList` with addresses enabled, so the fallback and the normal list cannot disagree about which restaurants exist (research R10)
- [X] T034 [US3] Add fallback and loading layout rules for both display states to `src/tabs/restaurant-map/RestaurantMap.module.css`
- [X] T035 [US3] Add a comment in `src/tabs/restaurant-map/RestaurantMap.tsx` recording that a provider error page with a successful `load` is undetectable and will not trigger the fallback, pointing to FR-037 — so nobody later reads the detection as complete
- [ ] T036 [US3] 🖐 Run `specs/003-restaurant-map/quickstart.md` §2.4 — offline fallback within 5s in both display states, then restore the network and confirm re-entry loads the live map with no page reload (FR-015)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T037 [P] Document the editorial parity procedure from `specs/003-restaurant-map/contracts/curated-data.md` §3 as a header comment in `src/tabs/restaurant-map/restaurants.static.ts`, so the next editor sees it where they work rather than in a spec folder
- [ ] T038 [P] 🖐 Run the parity check in `specs/003-restaurant-map/quickstart.md` §2.3 — every list number has a pin, every pin has a list entry, counts match, both languages (SC-011, FR-023)
- [X] T039 [P] Run `npm run build` and grep `dist/` for credentials, confirming only the public `mid` appears (SC-012, Principle VI)
- [X] T040 [P] Verify Principle IX removability: delete `src/tabs/restaurant-map/` and its `registry.ts` line, confirm the app still builds and runs, then restore — the fastest way to surface accidental coupling. **Result: PASS** — typecheck and build both succeeded with the feature deleted and its registry line removed
- [ ] T041 🖐 Run the accessibility and touch checks in `specs/003-restaurant-map/quickstart.md` §2.7, including keyboard focus order and screen-reader announcement of names from the list rather than the frame
- [X] T042 Run `npm run typecheck` and `npm test` as defined in `package.json` and confirm both are green across the `unit` and `layout` projects configured in `vite.config.ts`
- [ ] T043 Complete the constitution spot-check table in `specs/003-restaurant-map/quickstart.md` §3 and record the result on the pull request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T002 is external work and should start first because it has the longest lead time.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Stories (Phase 3–5)**: All depend on Foundational. They share `RestaurantMap.tsx` and `RestaurantMap.module.css`, so see the caveat below.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. No dependency on US2 or US3.
- **US2 (P2)**: Depends on Foundational. Builds on the component US1 creates but adds no requirement to US1 — US1 stays shippable without it.
- **US3 (P3)**: Depends on Foundational. Reuses `RestaurantList` from US1 (T015), which is why that component takes an `addresses` prop from the start.

### ⚠️ Caveat on cross-story parallelism

Unlike a typical service-layer feature, all three stories converge on the **same two files**
(`RestaurantMap.tsx` and `RestaurantMap.module.css`). Assigning US1, US2 and US3 to three developers
simultaneously would put them in constant conflict in those files.

The honest guidance for this feature: **run the stories sequentially in priority order**, and use the
`[P]` markers *within* each phase for parallelism. Parallelism across stories only pays off if one
developer takes T023 (`useMapActivity.ts`) and T014/T015 (`MapEmbed.tsx`, `RestaurantList.tsx`), which
are genuinely separate files, while another composes them.

### Within Each User Story

- Tests are written before implementation and must fail first
- Standalone components (`[P]`) before the composition that uses them
- Composition before the CSS that lays it out
- Manual verification (🖐) last, once the story renders

---

## Parallel Example: User Story 1

```bash
# Tests first — different files, no shared state:
Task: "T012 Default-state rendering tests in src/tabs/restaurant-map/RestaurantMap.test.tsx"
Task: "T013 No-scroll layout tests in src/tabs/restaurant-map/RestaurantMap.browser.test.tsx"

# Then the two standalone components together:
Task: "T014 Sandboxed iframe in src/tabs/restaurant-map/MapEmbed.tsx"
Task: "T015 Numbered list in src/tabs/restaurant-map/RestaurantList.tsx"

# T016 composes them — must wait for both.
```

## Parallel Example: Phase 2 Foundational

```bash
# Three independent files:
Task: "T005 Tab metadata in src/tabs/restaurant-map/meta.ts"
Task: "T006 EN/HU copy in src/tabs/restaurant-map/strings.ts"
Task: "T007 Curated data and constants in src/tabs/restaurant-map/restaurants.static.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup — start T002 (the external map) first; it gates everything visual
2. Phase 2 Foundational — the nav fix in T004 is what makes a fifth tab viable at all
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: run the independent test, plus the 🖐 escape check in T019
5. Demo — a visitor can find nearby restaurants, which is the whole point of the feature

### Incremental Delivery

1. Setup + Foundational → a fifth tab exists and mounts
2. + US1 → **MVP**: map, pins, names, walking times
3. + US2 → exploration, expand state, and safe self-recovery
4. + US3 → resilience when the network or provider fails
5. Polish → parity, removability, and the constitution spot-checks

Each increment leaves the kiosk in a shippable state.

---

## Notes

- `[P]` = different files, no dependency on incomplete work
- 🖐 = cannot be automated; the frame is cross-origin and the pins live in Google
- T004 is the only change outside `src/tabs/restaurant-map/` besides the one registry line — if a task tempts you to touch another shared file, that is a Principle IX problem worth raising rather than absorbing
- The ceiling in T023 is not defensive padding. Removing it is what would make the mechanism a Principle V violation (see [contracts/view-states.md](contracts/view-states.md) §2)
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
