---

description: "Task list for the Guest Wi-Fi Panel feature"
---

# Tasks: Guest Wi-Fi Panel

**Input**: Design documents from `/specs/004-guest-wifi/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The design documents specify test obligations explicitly — see [contracts/wifi-qr-payload.md](contracts/wifi-qr-payload.md)'s test vectors, the validation rules in [data-model.md](data-model.md) §1, and [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file it touches

## Path Conventions

Single static SPA at the repository root. Feature code lives in `src/tabs/guest-wifi/` (an
existing folder — see plan.md's Project Structure); tests sit beside the code they cover
(`*.test.ts[x]` for the `unit` project, `*.browser.test.tsx` for the `layout` project).

## Post-implementation note (2026-09-10)

Tasks below describe the panel as originally built, with a dark background local to this tab.
After implementation, that was revised to use the same light `--color-surface` background every
other tab uses — see spec.md's Clarifications, plan.md's "Post-implementation revision" section,
and [contracts/visual-theme.md](contracts/visual-theme.md) for the current, accurate design.
Task descriptions and checkboxes below are left as a record of what was done and are not rewritten
per edit — several (T010, T011, T021, T022, T026) mention "dark" in a way that is no longer
accurate to the shipped panel, and the glow later moved from the QR plate to the whole panel (see
plan.md's "revision 2"). **Phase 7** (added later, after all of the above) covers the on-screen
config editor — genuinely new scope, not a revision.

## 🖐 Manual tasks

A phone camera scanning a physical screen cannot be driven from an automated test. These are
marked 🖐 and are **not optional**: they cover SC-001 (join under 15s), the QR's actual
scannability, and the visual glow/dimming behaviour that only a real render can confirm.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The one new dependency is installed and confirmed before anything depends on it.

- [X] T001 Run `npm install uqr`, confirm the installed version's `encode()` API matches
  `research.md` R1, and update `research.md` R1's version note with the exact version installed
  (mirrors 003-restaurant-map's T001 icon-verification caution)

**Checkpoint**: `uqr` is installed and its API confirmed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The config, its validation, and the copy every story reads must exist before any
story can render real content. `GuestWifi.tsx` itself is created here as a minimal shell (same
reasoning as 003-restaurant-map's T009) because Phases 3–5 all converge on the same two files.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `src/tabs/guest-wifi/wifiConfig.static.ts` defining the `GuestNetworkConfig`
  type and the frozen config constant per `specs/004-guest-wifi/data-model.md` §1, with a
  `⚠️ PLACEHOLDER` `ssid: ''` value (so the app boots in the FR-014 fallback state until a real
  network is configured — see quickstart.md step 2), following the documentation-comment style of
  `restaurant-map/restaurants.static.ts`'s `MAP_ID` placeholder
- [X] T003 [P] Write `src/tabs/guest-wifi/wifiConfig.test.ts` asserting validation rules 1–4 from
  `specs/004-guest-wifi/data-model.md` §1 (SSID 0 or 1–32 bytes; password empty iff `nopass`;
  password 8–63 chars for `WPA`; empty SSID is the only fallback trigger)
- [X] T004 [P] Create `src/tabs/guest-wifi/strings.ts` with EN/HU copy for: panel heading, "Scan
  to connect" instruction, "Network name" / "Password" labels, and the fallback heading/body
  (FR-006), typed as `LocalizedText` and shaped like `restaurant-map/strings.ts`'s
  `getMapStrings(locale)` pattern
- [X] T005 Create `src/tabs/guest-wifi/GuestWifi.tsx` as a minimal shell (renders the localized
  heading only, reading `wifiConfig.static.ts` and `strings.ts`) and update
  `src/tabs/guest-wifi/index.tsx` to render it instead of `TabPlaceholder` — depends on T002, T004

**Checkpoint**: The tab mounts real (if minimal) content, the config is validated, and copy exists
in both locales. User story work can begin.

---

## Phase 3: User Story 1 - A visitor scans a code and is online in seconds (Priority: P1) 🎯 MVP

**Goal**: Tapping the tab shows a dark, glowing panel with a scannable Wi-Fi QR code that joins a
phone to the guest network with zero manual entry.

**Independent Test**: Tap the Guest Wi-Fi tab and confirm a QR code appears that, scanned with a
standard phone camera, offers to join the configured network with no typing.

### Tests for User Story 1

- [X] T006 [P] [US1] Write `src/tabs/guest-wifi/qr.test.ts` asserting the four test vectors in
  `specs/004-guest-wifi/contracts/wifi-qr-payload.md` (plain password, a password containing `;`,
  an open/`nopass` network, and a value containing `"` and `\`)
- [X] T007 [P] [US1] Extend `src/tabs/guest-wifi/GuestWifi.test.tsx` (create if absent) asserting
  the rendered QR `<svg>` uses the fixed `--gw-qr-light`/`--gw-qr-dark` fills from
  `specs/004-guest-wifi/contracts/visual-theme.md` §2 regardless of the panel's dark theme, and
  carries `aria-hidden="true"`

### Implementation for User Story 1

- [X] T008 [US1] Create `src/tabs/guest-wifi/qr.ts` implementing `buildWifiQrPayload()` exactly
  per `specs/004-guest-wifi/contracts/wifi-qr-payload.md` (escaping `\ ; , " :`, `T:WPA`/`T:nopass`,
  trailing `;;`) plus a helper that calls `uqr`'s `encode()` and returns the boolean matrix
  needed for T009 — depends on T006 (test must fail first), T001
- [X] T009 [US1] Render the QR light plate as an inline `<svg>` in `GuestWifi.tsx` from T008's
  matrix — one `<rect>` per dark module, a fixed-colour background `<rect>` sized to the matrix
  plus the mandatory 4-module quiet zone, `aria-hidden="true"` — depends on T008, T005
- [X] T010 [US1] Create `src/tabs/guest-wifi/GuestWifi.module.css` defining the local dark-theme
  tokens from `specs/004-guest-wifi/contracts/visual-theme.md` §1 (`--gw-bg`, `--gw-text`,
  `--gw-text-soft`, `--gw-glow-blue`, `--gw-glow-orange`), the panel's dark background, and a
  compositor-only (`opacity`/`transform` only) glow `@keyframes` positioned behind the QR plate,
  wrapped in `@media (prefers-reduced-motion: reduce)` per research R4
- [X] T011 [US1] Compose the dark panel root, heading, and QR plate in `GuestWifi.tsx`, applying
  `GuestWifi.module.css`'s classes so the entire content region (not a sub-card) goes dark per
  Clarifications 2026-09-10 Q2 — depends on T009, T010
- [ ] T012 [US1] 🖐 Run `specs/004-guest-wifi/quickstart.md` steps 4–5: confirm the panel appears
  inline with no scroll/modal/flash, then scan the QR with a real phone camera and time the join
  (must be under 15s, SC-001); confirm the QR plate stays plain black-on-white with the glow only
  framing it, never tinting it (Clarifications Q1)

**Checkpoint**: User Story 1 is fully functional and demoable on its own. This is the MVP.

---

## Phase 4: User Story 2 - A visitor without a working scanner connects manually (Priority: P2)

**Goal**: The network name and password are always printed in large legible text beside the QR
code, and a not-yet-configured network shows a clear fallback instead of a broken panel.

**Independent Test**: With Story 1 implemented, ignore the QR code and confirm the network name
and password are independently legible and sufficient to join by hand; then confirm an
unconfigured network shows a fallback message, not a blank or broken layout.

### Tests for User Story 2

- [X] T013 [P] [US2] Extend `src/tabs/guest-wifi/GuestWifi.test.tsx` asserting: (a) the network
  name and password render as plain visible text with no tap required (Story 2 AC1), and (b) when
  `wifiConfig.static.ts`'s `ssid` is `''`, the fallback heading/body render instead of a QR code
  or credential text, with no console error (Story 2 AC2, FR-014, research R7)

### Implementation for User Story 2

- [X] T014 [US2] Add the printed network-name and password text block to `GuestWifi.tsx`, sourced
  directly from `wifiConfig.static.ts`, positioned beside the QR plate and always visible (FR-003)
  — depends on T005, T011
- [X] T015 [US2] Add the "not configured" fallback branch to `GuestWifi.tsx`, keyed on
  `config.ssid === ''` (research R7): render `strings.ts`'s fallback heading/body instead of
  attempting to build a QR payload or credential text — depends on T008, T014
- [X] T016 [US2] Add layout rules for the credential text block and the fallback state to
  `GuestWifi.module.css`, sized to comfortably fit the worst-case 32-character SSID and
  63-character password on two lines each with no scrolling (research R6, FR-008)
- [ ] T017 [US2] 🖐 Run `specs/004-guest-wifi/quickstart.md` steps 6 and 9: type the printed SSID
  and password into a second device by hand and confirm it joins; then temporarily set `ssid: ''`
  in `wifiConfig.static.ts`, reload, confirm the fallback renders cleanly, and revert the change

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - A visitor switches language and the panel stays correct (Priority: P3)

**Goal**: Every instructional label on the panel switches between EN and HU with the kiosk's
existing language toggle; the network name and password never change.

**Independent Test**: With Story 1 implemented, toggle the language control while the panel is
open and confirm every label switches while the SSID/password text stays identical.

### Tests for User Story 3

- [X] T018 [P] [US3] Extend `src/tabs/guest-wifi/GuestWifi.test.tsx` asserting that toggling
  `useKiosk().locale` switches every `strings.ts` label rendered on the panel, while the rendered
  SSID and password text is byte-identical in both locales (Story 3 AC1, FR-006)

### Implementation for User Story 3

- [X] T019 [US3] Wire `useKiosk().locale` into `GuestWifi.tsx` so every `strings.ts` label
  resolves per-locale, mirroring `restaurant-map/strings.ts`'s `getMapStrings(locale)` shape —
  depends on T005, T014, T015
- [ ] T020 [US3] 🖐 Run `specs/004-guest-wifi/quickstart.md` step 7: toggle EN/HU on the live tab
  and visually confirm every label switches while the SSID and password stay unchanged

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Write `src/tabs/guest-wifi/GuestWifi.browser.test.tsx` asserting no page scroll at
  1920x1280 with the worst-case 32/63-character SSID and password (research R6), in both EN and
  HU, in both the normal and fallback states
- [ ] T022 [P] 🖐 Run `specs/004-guest-wifi/quickstart.md` step 8: confirm the panel — glow
  included — dims to ~16% opacity after the standard idle period exactly like every other tab
  (FR-010, Clarifications Q1), with the glow still visibly animating underneath the dim, and
  confirm it returns to full brightness immediately on touch
- [X] T023 [P] Verify Principle IX isolation: confirm `git diff --stat` against `main` touches
  only files under `src/tabs/guest-wifi/` plus `package.json`/`package-lock.json` — no
  `tokens.css`, `TabNav`, or `registry.ts` changes (plan.md's "zero shared-chrome changes" claim)
- [X] T024 [P] Run `npm run build` and confirm nothing in `dist/` reveals the QR/credential
  generation as a network-dependent call (Principle VI/VIII sanity check — everything must be
  computed client-side from the bundled static config, per research R1)
- [X] T025 Run `npm run typecheck`, `npm run test:unit`, and `npm run test:layout` and confirm all
  are green
- [ ] T026 🖐 Run the accessibility pass from `specs/004-guest-wifi/quickstart.md`: confirm the QR
  `<svg>` is skipped by a screen reader (`aria-hidden`), the printed SSID/password text is reached
  in a sensible keyboard focus order, and the dark-panel text contrast matches the ratios recorded
  in `specs/004-guest-wifi/contracts/visual-theme.md` §1
- [X] T027 Re-check the Constitution Check gate table in `specs/004-guest-wifi/plan.md` against
  the finished implementation and record any drift (expected: none — the gate passed with zero
  deviations at plan time)

---

## Phase 7: User Story 4 - An operator sets or updates the network from the kiosk itself (Priority: P4)

**Added post-implementation** (2026-09-10), after Phases 1–6 above were already complete — real
new scope requested after the visitor-facing panel was working, not a revision of it. See
spec.md's Session 2026-09-10 (feature addition) note, `research.md` R9–R10, and
`contracts/config-editing.md`.

**Goal**: An operator can set or change the guest network directly at the kiosk — no redeploy —
through an inline "Edit" control on the panel.

**Independent Test**: Tap Edit, enter a network name and password, tap Save, confirm the panel
shows the new QR/credentials immediately, then reload and confirm they're still there.

### Tests for User Story 4

- [X] T028 [P] [US4] Write `src/tabs/guest-wifi/wifiConfig.storage.test.ts`: `validateConfigInput`
  against valid/invalid WPA and open-network inputs (contracts/config-editing.md §2), and
  `loadStoredConfig`/`saveConfigOverride` round-tripping, rejecting corrupt JSON, rejecting a
  shape that no longer validates
- [X] T029 [P] [US4] Extend `src/tabs/guest-wifi/GuestWifi.test.tsx`: opening the editor from both
  the configured and not-configured states pre-fills correctly; Save calls `onSave` with the
  edited config and returns to the display view; Cancel discards changes without calling
  `onSave`; inline errors block Save for an empty ssid and a too-short WPA password; selecting
  "Open network" hides the password field and saves `securityType: 'nopass'`; a saved edit is
  shown again after unmounting and remounting `<GuestWifi />` (device-local persistence)

### Implementation for User Story 4

- [X] T030 [US4] Create `src/tabs/guest-wifi/wifiConfig.storage.ts` implementing
  `validateConfigInput`, `loadStoredConfig`, and `saveConfigOverride` exactly per
  `specs/004-guest-wifi/contracts/config-editing.md` §2–3 — depends on T028 (test must fail
  first)
- [X] T031 [US4] Add `editButtonLabel`, `editHeading`, `securityTypeLabel`, `securityWpaLabel`,
  `securityOpenLabel`, `saveButtonLabel`, `cancelButtonLabel`, `ssidLengthError`, and
  `passwordLengthError` to `src/tabs/guest-wifi/strings.ts` (EN/HU)
- [X] T032 [US4] Restructure `src/tabs/guest-wifi/GuestWifi.tsx`: extract the `EditForm`
  component (ssid input, password input, WPA/open toggle, Save/Cancel), give `GuestWifiPanel` an
  `isEditing` state and a required `onSave` prop, and give the default-exported `GuestWifi` its
  own state resolving `loadStoredConfig() ?? WIFI_CONFIG` and calling `saveConfigOverride` on
  save (contracts/config-editing.md §1) — depends on T030, T031
- [X] T033 [US4] Add `.headerRow`, `.editButton`, `.editForm`, `.editHeading`, `.field`,
  `.fieldLabel`, `.fieldInput`, `.fieldError`, `.securityToggle`, `.securityOption`,
  `.formActions`, `.cancelButton`, `.saveButton`, and `.actionIcon` to
  `src/tabs/guest-wifi/GuestWifi.module.css`, all touch-target-compliant (contracts/config-editing.md §4)
- [X] T034 [US4] Extend `src/tabs/guest-wifi/GuestWifi.browser.test.tsx`: no-scroll in the editor
  state with worst-case pre-filled values, and 64px touch targets for Edit, Save, Cancel, and
  both security-type buttons
- [X] T035 [US4] 🖐 Verify in a real browser: edit and save a network, confirm the QR code
  regenerates and the display updates with no page reload, then reload the page and confirm the
  saved network is still shown (spec FR-018, Acceptance Scenario 5) — done for this change;
  re-verify after any future edit to this flow

**Checkpoint**: User Story 4 is functional independently of Stories 1–3 having already shipped
(they had). Re-ran the full suite after this phase: 164/164 unit, 21/21 layout.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Stories (Phase 3–5)**: All depend on Foundational. They share `GuestWifi.tsx` and
  `GuestWifi.module.css` — see the caveat below.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. No dependency on US2 or US3.
- **US2 (P2)**: Depends on Foundational. Adds the credential text and fallback branch beside
  US1's QR plate — US1 stays shippable without it.
- **US3 (P3)**: Depends on Foundational. Wires locale into labels US1/US2 already render — adds
  no new UI of its own.

### ⚠️ Caveat on cross-story parallelism

Like 003-restaurant-map, all three stories converge on the same two files (`GuestWifi.tsx`,
`GuestWifi.module.css`). Assigning US1–US3 to different developers in parallel would put them in
constant conflict in those files. **Run the stories sequentially in priority order**; use `[P]`
markers *within* each phase (e.g. the three Foundational files, or the two US1 test files) for
real parallelism.

### Within Each User Story

- Tests are written before implementation and must fail first
- The QR payload/matrix logic (`qr.ts`, no UI) before the component that renders it
- Composition (`GuestWifi.tsx`) before the CSS that lays it out
- Manual verification (🖐) last, once the story renders

---

## Parallel Example: Phase 2 Foundational

```bash
# Three independent files:
Task: "T002 Guest network config in src/tabs/guest-wifi/wifiConfig.static.ts"
Task: "T003 Config validation tests in src/tabs/guest-wifi/wifiConfig.test.ts"
Task: "T004 EN/HU copy in src/tabs/guest-wifi/strings.ts"
```

## Parallel Example: User Story 1

```bash
# Tests first — different files, no shared state:
Task: "T006 QR payload escaping tests in src/tabs/guest-wifi/qr.test.ts"
Task: "T007 QR plate colour-fixture test in src/tabs/guest-wifi/GuestWifi.test.tsx"

# T008 (qr.ts) has no UI dependency and can proceed once T006 fails as expected;
# T009–T011 compose sequentially in GuestWifi.tsx/GuestWifi.module.css.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup — install and confirm `uqr`
2. Phase 2 Foundational — config, copy, and a mounted shell
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: run the independent test, plus the 🖐 phone-scan check in T012
5. Demo — a visitor can scan a QR code and get online, which is the whole point of the feature

### Incremental Delivery

1. Setup + Foundational → the tab renders real (minimal) content
2. + US1 → **MVP**: scannable QR, dark glowing panel
3. + US2 → manual fallback text and the not-configured state
4. + US3 → language correctness
5. Polish → isolation check, build sanity, accessibility, constitution re-check

Each increment leaves the kiosk in a shippable state.

---

## Notes

- `[P]` = different files, no dependency on incomplete work
- 🖐 = cannot be automated — a phone camera scanning a physical screen is outside any test runner
- `package.json`/`package-lock.json` are the only files outside `src/tabs/guest-wifi/` this
  feature touches — no other shared file changes are expected (plan.md, research R5)
- T002's placeholder `ssid: ''` is deliberate: it means the feature ships buildable and testable
  end-to-end (in its documented fallback state) before the real network credentials are known,
  the same posture 003-restaurant-map's `MAP_ID` placeholder used
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
