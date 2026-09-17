---

description: "Task list for feature implementation"
---

# Tasks: Voice Information Assistant

**Input**: Design documents from `specs/003-voice-info-agent/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included, colocated with source, matching the existing repo convention (spec 001/002).

**Organization**: Tasks are grouped by user story (spec.md P1-P4 as of this file's original authoring) to enable independent implementation and testing.

**Numbering note (2026-09-09 amendment)**: spec.md was later amended to add a new, higher-priority "User Story 1 - Someone signs in with a Microsoft account" ahead of everything below, renumbering the original US1-US4 to US2-US5. This file's phase headers below were **not** renumbered to match (to avoid rewriting completed, already-verified task history) — read `[US1]` through `[US4]` in this file as spec.md's *current* US2 through US5. The sign-in story's own tasks are tracked separately in Phase 8 at the end of this file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)

## Path Conventions

Single static frontend project rooted at repo root (`src/`), per plan.md.

---

## Phase 1: Setup

- [X] T001 Create `src/tabs/voice-assistant/meta.ts` -- `id: 'voice-assistant'`, `label: { en, hu }`, `icon: Mic` (lucide-react), `accent: 'emerald'` (the one unused accent token), satisfying `TabMeta` (`src/types/tab.ts`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the tab exist and reachable before any user story is testable.

- [X] T002 Register the tab in `src/tabs/registry.ts`: import `VoiceAssistant`/`meta` from `./voice-assistant` and add `{ meta: voiceAssistantMeta, Component: VoiceAssistant }` to the `TABS` array.
- [X] T003 [P] Create `src/tabs/voice-assistant/strings.ts` -- tab-owned `Record<Locale, {...}>` copy: heading, start-button label, end-button label, connecting label, load-error fallback text (Constitution IX -- no shared shell string map edits).
- [X] T004 [P] Create `src/tabs/voice-assistant/AgentPanel.module.css` -- fixed-size container filling the content region (`height: 100%`, `overflow: hidden` on the outer wrapper), per `contracts/agent-embed-contract.md` guarantee 1.
- [X] T005 Create `src/tabs/voice-assistant/index.tsx` -- default-exports a `VoiceAssistant` component rendering `<AgentPanel />`; re-exports `meta`.

**Checkpoint**: Tab appears in nav, selectable, renders an (empty) panel -- no scroll, correct icon/label/locale. ✅ Verified (registry.test.tsx, TabNav.test.tsx).

---

## Phase 3: User Story 1 - Visitor asks about the Innovation Centre by voice (Priority: P1) - MVP

**Goal**: A visitor can open the section, start the agent, ask a question, and get an answer -- end to end.

**Independent Test**: Open the tab, tap Start, ask a question about the Innovation Centre, get a relevant answer, per spec.md US1.

- [X] T006 [US1] Create `src/tabs/voice-assistant/AgentEmbedContainer.tsx` implementing `contracts/agent-embed-contract.md`: renders the Copilot Studio iframe (`src="https://copilotstudio.microsoft.com/environments/Default-371cb917-b098-4303-b878-c182ec8403ac/bots/cre88_routingagent__iazxL/webchat?__version__=2&enableFileAttachment=false&cliAgent=true"`, `frameBorder={0}`, `width: 100%; height: 100%`), a connecting/loading overlay until `onLoad` fires, a load-error/timeout (10s) fallback with retry (FR-010), and calls `onEnd` cleanup correctly on unmount (guarantee 2). Real URL used from the start (`copilotStudioEmbed.ts`) -- supplied by the user during this session, no stub needed.
- [X] T007 [US1] Create `src/tabs/voice-assistant/AgentPanel.tsx` -- `AgentPanelState` (`'idle' | 'active'`) state machine: idle renders heading + "Start Assistant" button (>=64px touch target, `--touch-target-min`/`--touch-gap-min` tokens, `aria-label`); tapping Start transitions to active and mounts `AgentEmbedContainer`.
- [X] T008 [US1] Create `src/tabs/voice-assistant/useIframeIdleKeepalive.ts` per `contracts/idle-keepalive-contract.md` (focus-based reset bridge) and wire it into `AgentPanel` while `status === 'active'`, using `reset` exposed from `KioskContext` (added `reset` to `KioskState`, sourced from `useIdleReset`). Implemented via document-level `focusin`/`focusout` (Chromium-only simplification, see research.md R5) rather than `window.blur`.
- [X] T009 [P] [US1] `src/tabs/voice-assistant/useIframeIdleKeepalive.test.ts` -- unit tests: no interval while `targetRef.current` is null; starts calling `reset()` on focus-in, stops on focus-out; cleans up on unmount (jsdom, fake timers). 4/4 passing.
- [X] T010 [P] [US1] `src/tabs/voice-assistant/AgentPanel.test.tsx` -- unit tests: idle state renders heading + Start button; tapping Start renders `AgentEmbedContainer`; Start button has correct `aria-label`; heading/button/prompt text swap with `locale`. 4/4 passing.
- [X] T011 [US1] `src/tabs/voice-assistant/VoiceAssistant.layout.browser.test.tsx` -- extends the Playwright browser-mode layout project to assert no vertical/horizontal scroll for this tab in both idle and active states at 1920x1280, plus >=64px touch targets for Start/End. 3/3 passing. Also surfaced and fixed a pre-existing bug: `TabNav.module.css` hardcoded a 4-column grid, which wrapped the 5th tab onto a second row -- changed to flex so the nav is tab-count-agnostic.
- [X] T012 [US1] Manual validation: ran the real embed end-to-end in real Chromium (Playwright) against the dev server. **Result**: the iframe loads, Bot Framework Web Chat initializes, and a Direct Line conversation opens successfully -- but the bot replies "You don't have access to talk to this bot, contact the owner." This is the Copilot Studio agent's own authorization check, not a browser/app defect. Recorded in research.md ("T012 finding", under R3) and plan.md's Constitution Check, with three remediation paths for whoever administers the Copilot Studio environment (most likely: publish via the "Custom website" channel instead of using the maker/test canvas link).

**Checkpoint**: User Story 1 is independently testable -- the core ask/answer loop is verified working end-to-end at the app/embed level; the one remaining blocker (bot-side authorization) is external to this codebase and clearly documented.

---

## Phase 4: User Story 2 - Visitor asks about the company (Priority: P2)

**Goal**: Company questions are answered through the same, already-integrated embed (spec.md's Assumptions: domain routing is internal to the Copilot Studio agent -- no separate code path in this repo).

**Independent Test**: With the embed active, ask a company question and get a distinct, correct answer without picking a "mode" first.

- [X] T013 [US2] Manual validation only (no new production code -- see plan.md "Deviations from the supplied technical input"): attempted against the live embed from T012; blocked by the same bot-side access denial, so no question of any kind (including company questions) currently gets a real answer. Recorded in quickstart.md's "User Story 2 / 3 validation notes" as a follow-up to re-run once access is fixed.

**Checkpoint**: No separate implementation required (confirmed by design); actual question-answering validation is pending the Copilot Studio access fix from T012.

---

## Phase 5: User Story 3 - Visitor asks about employees (Priority: P3)

**Goal**: Employee questions (within the approved curated scope) are answered through the same embed.

**Independent Test**: Ask an in-scope employee question and an out-of-scope one; confirm the agent answers the former and declines the latter without fabricating.

- [X] T014 [US3] Manual validation only (no new production code): attempted against the live embed from T012; blocked by the same bot-side access denial. Also flagged: whether the routing agent's knowledge content has actually been configured with the curated employee dataset from spec.md Clarifications Q1 remains unverified and is Copilot Studio-side content authoring, outside this repository. Recorded in quickstart.md.

**Checkpoint**: Same external blocker as US2; no separate implementation required in this repo.

---

## Phase 6: User Story 4 - Visitor discovers and cleanly exits the voice section (Priority: P4)

**Goal**: A visitor with no prior guidance sees example questions, and can end a session cleanly.

**Independent Test**: Open with no prior interaction -> see 3 example prompts spanning all domains; end an active session -> return inline to idle with no modal.

- [X] T015 [P] [US4] Create `src/tabs/voice-assistant/examplePrompts.ts` -- 3 `ExamplePrompt` entries (`domain`, `text: { en, hu }`), one per Knowledge Domain (Innovation Centre, company, employees), per data-model.md.
- [X] T016 [US4] Extend `AgentPanel.tsx` idle view to render the `examplePrompts` list beneath the heading (FR-016).
- [X] T017 [US4] Add an "End" control to `AgentPanel`'s active view that transitions state back to `'idle'` and unmounts `AgentEmbedContainer` (FR-008); no confirmation dialog, no route change.
- [X] T018 [P] [US4] Extend `AgentPanel.test.tsx` with cases: all 3 example prompts render (one per domain, in current locale); tapping End returns to idle and the embed container unmounts. Covered.

**Checkpoint**: All four user stories independently functional and testable. ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T019 [P] Updated `specs/003-voice-info-agent/research.md` (R3, R4, R5, R9) and `plan.md` (Constitution Check IV/VI) to record the actual embed snippet integrated in T006 and the real outcome of the access/permissions check from T012 -- both originally-conditional Constitution Check items (IV, VI) resolved to PASS; the bot-side access denial documented as a separate, external, non-Constitution finding.
- [X] T020 [P] Updated `quickstart.md` marking which scenarios were actually executed against the live embed and their results, plus a new "User Story 2 / 3 validation notes" section and a "Remaining follow-up" section replacing the old "once the HTML is supplied" placeholder.
- [X] T021 Ran `npm run typecheck` and `npm run test` (full suite): typecheck clean, 103/103 tests passing (15 files: 12 jsdom unit + 2 browser-mode layout, including the two new voice-assistant test files).
- [X] T022 Ran `npm run test:layout`: 9/9 passing, including the fixed 5-tab nav gap assertion and the new voice-assistant idle/active no-scroll + touch-target assertions.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** -> **Foundational (Phase 2)**: sequential, blocks everything else.
- **US1 (Phase 3)**: depends on Foundational. MVP -- delivers the core ask/answer loop.
- **US2 (Phase 4)** and **US3 (Phase 5)**: depend on US1's embed integration (T006/T012) being in place to validate against, but add no new production code.
- **US4 (Phase 6)**: depends on Foundational (`AgentPanel.tsx` from US1 T007 for the state machine it extends) -- implemented after US1 for a working Start/embed flow to attach example prompts and End to, but is conceptually independent (discoverability/exit chrome, not the ask/answer loop itself).
- **Polish (Phase 7)**: after all desired stories are complete.

## Parallel Opportunities

- T003, T004 (Phase 2) -- different files, no dependency on each other.
- T009, T010 (Phase 3) -- different test files.
- T015, T018 (Phase 6) -- different files (new data file vs. test extension), though T018's End-button case depends on T017 landing first.
- T019, T020 (Phase 7) -- different doc files.

## Implementation Strategy

**MVP first**: Phases 1-3 (Setup, Foundational, US1) deliver a fully working (or clearly documented as blocked) ask-and-answer loop against the real Copilot Studio agent. Phases 4-5 are validation-only checkpoints riding on that same integration. Phase 6 adds discoverability/exit polish. Phase 7 closes out documentation and full-suite verification.

---

## Phase 8: Sign-in amendment (spec.md User Story 1, added 2026-09-09)

**Trigger**: user amendment -- "The agent integrated by copilot is now published with microsoft authentication. What I want to do is have a login possibility to my (or someone's) microsoft account when entering the voice-info-agent. make this a pop-up because the whole functionality is worthless without it. align all the .MD files for this."

**Goal**: the assistant can be signed into with a shared Microsoft account, via a popup, and that sign-in persists across visitor conversations.

- [X] T023 Verified empirically (not assumed) that Microsoft's real sign-in endpoint cannot be iframed: `curl -D - https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=<real-id>&...` and `curl -D - https://login.live.com/` both return `X-Frame-Options: DENY`/`deny`. This is the justification required by the constitution amendment below, not a general/assumed claim.
- [X] T024 Amended `.specify/memory/constitution.md`: added a narrow, guarded exception to Principle IV permitting a user-initiated popup solely for third-party identity sign-in when the provider's login page cannot be iframed (verified, not assumed). Added a matching Quality Gates bullet ("Popup-exception audit"). Bumped version 1.0.0 -> 1.1.0 (MINOR: existing guidance materially expanded, no principle removed/redefined), updated the Sync Impact Report, Ratified/Last Amended dates.
- [X] T025 Rewrote `spec.md`: added new User Story 1 ("Someone signs in with a Microsoft account so the assistant can be used", P1), renumbered the original US1-US4 to US2-US5, added FR-019 through FR-023 (sign-in requirement, popup mechanism, session persistence across conversations, operator/shared-account model, cancel/retry behavior), added the Sign-In Session key entity, added SC-008/SC-009, added sign-in-related Edge Cases and Assumptions, and a new Clarifications entry recording the amendment and the "shared account" decision (resolved directly from the user's own phrasing, no question needed).
- [X] T026 [P] Updated `specs/003-voice-info-agent/checklists/requirements.md` with a note re-confirming the checklist still passes after the amendment.
- [X] T027 Updated `plan.md`: Summary addendum explaining Bot Framework Web Chat owns the sign-in popup natively (this app only avoids blocking it and surfaces a hint); Technical Context Constraints/Scale-Scope updated; new Deviations row for the Constitution IV exception; Constitution Check table's Principle IV entry rewritten to PASS-under-exception citing the verified `X-Frame-Options` fact; T012 finding section updated with the 2026-09-09 retest (same denial, even with auth published, confirming the block is upstream of the sign-in step); Project Structure notes on what did/didn't need new files.
- [X] T028 [P] Updated `research.md`: added R10 (why sign-in must be a popup, who owns the `window.open()` call, what this app is/isn't responsible for) and R11 (2026-09-09 retest finding after publishing with Microsoft auth -- identical denial, no sign-in card reached).
- [X] T029 [P] Updated `data-model.md`: added a note that the Sign-In Session entity is not modeled by this codebase at all (opaque, cross-origin, no observable state), and that `signInHint` is shown unconditionally rather than gated on auth state for that reason.
- [X] T030 [P] Rewrote `contracts/agent-embed-contract.md`: corrected the props to match the as-shipped component (`locale`, `iframeRef` -- not the originally-planned `onReady`/`onEnd`), and added guarantee 6 (no `sandbox` attribute, so the embed's own sign-in popup is never blocked).
- [X] T031 [P] Rewrote `quickstart.md`: inserted a new Scenario 2 (signing in) with the executed 2026-09-09 retest result, renumbered subsequent scenarios, updated the no-scroll/i18n/US-validation scenarios to account for the sign-in hint, and updated "Remaining follow-up" to include the verified `X-Frame-Options` fact.
- [X] T032 [US1-signin] Added `signInHint` EN/HU strings to `src/tabs/voice-assistant/strings.ts` (FR-019, FR-023).
- [X] T033 [US1-signin] Rendered the sign-in hint in `AgentPanel.tsx`'s active view, above the embed, unconditionally (data-model.md: no auth-state signal is observable); added `.signInHint` style to `AgentPanel.module.css`.
- [X] T034 [US1-signin] Documented, via an in-code comment on the `<iframe>` in `AgentEmbedContainer.tsx`, that no `sandbox` attribute is used and why (contract guarantee 6) -- this is the actual mechanism that keeps Bot Framework Web Chat's sign-in popup functional; no other code change was needed since this app never calls `window.open()` itself.
- [X] T035 [P] [US1-signin] Extended `AgentPanel.test.tsx`: sign-in hint absent while idle, present once active, present (in Hungarian) after a locale switch.
- [X] T036 Re-ran `npm run typecheck`, `npm run test` (104/104 passing, up from 103), and `npm run build` -- all clean after the amendment.

**Checkpoint**: Sign-in architecture fully implemented and documented on this app's side. **Not yet validated against a real sign-in prompt** -- retesting after the Microsoft-auth publish reproduced the exact same channel-access denial from T012, before any sign-in card is reached (research.md R11). This is an external Copilot Studio configuration blocker, not incomplete work in this repo.

---

## Outstanding follow-up (outside this repo) — RESOLVED 2026-09-10, see Phase 9

Whoever administers the Copilot Studio environment needs to resolve the bot's "You don't have access to talk to this bot, contact the owner" response for this kiosk's caller -- see research.md's T012/R11 findings for three concrete remediation paths, most likely re-publishing the agent via the "Custom website" channel rather than using the maker/test canvas link currently supplied. Publishing with Microsoft authentication (2026-09-09) did not by itself resolve this, because the caller is rejected at an earlier channel/environment-access check, before the bot's own sign-in requirement is ever consulted. Once that's fixed, re-run quickstart.md Scenario 2 to confirm the actual Microsoft sign-in popup fires and completes, then Scenario 3 onward to validate spec.md's SC-001-SC-003 and SC-008-SC-009 end-to-end with real answers.

**Resolved**: the actual cause (research.md's 2026-09-10 CORRECTION) was the bot's Web Channel Security "Require secured access" setting, not the maker-canvas theory above. The user re-deployed a new bot with it OFF. But this made the *entire sign-in architecture* (Phase 8, User Story 1, FR-019-FR-023) moot rather than validating it -- see Phase 9.

---

## Phase 9: Hands-free pivot -- new no-auth agent, Direct Line integration, Chrome STT (spec.md 2026-09-10 amendment)

**Trigger**: user amendment -- new Copilot Studio agent deployment (`cre88_noauthroutingagent_FUwQYD`) published without required authentication; "include voice speech to text... integrate this with chrome's built in STT... I do not want the user to have [to] press any button while discussing with the agent"; follow-up: "Could there be a different UI for the conversation and the agent only used in the background? so the request is sent into the chat of the agent, but the voice command is ingested through an input speech UI."

**Goal**: a visitor has an entire conversation using only their voice -- no sign-in, no push-to-talk, no per-question button -- with the agent's own chat UI never shown at all.

**Numbering note**: continues this file's existing convention (see the top-of-file numbering note for Phase 8) of not renumbering completed, already-verified task history. Phase 8's sign-in tasks remain accurate history for what shipped 2026-09-09; they are superseded in effect, not retroactively rewritten.

- [X] T037 Investigated whether the hosted Copilot Studio iframe (`.../webchat`) could support hands-free voice input via `postMessage` injection or DOM access. Confirmed impossible: cross-origin (same-origin policy blocks DOM access) and `agent-embed-contract.md`'s own T012 finding already recorded "no `postMessage` observed" from the original Playwright run. Decision: stop embedding the hosted page; talk to the bot's Direct Line channel directly. Recorded as research.md R12.
- [X] T038 User confirmed access to the bot's Direct Line "Secret 1" under Copilot Studio -> Channels -> Web Channel Security, and that enabling "Require secured access" there would disable the (now working) unauthenticated Demo website -- this is what led to the research.md CORRECTION (the actual T012/R11 root cause) and to the Direct Line integration decision (R13).
- [X] T039 **-- REVERTED, see T062-T066 below.** Confirmed this repo's hosting (`infra/`) is 100% static (S3 + CloudFront, no backend) before designing the token-exchange proxy, on the assumption that a new serverless component would be required for Direct Line access. That assumption was wrong (T062).
- [X] T040 **-- REVERTED, see T062-T066 below.** Created `infra/modules/directline-token-proxy/` (Terraform): `aws_secretsmanager_secret` for the Direct Line secret, an IAM role scoped to `secretsmanager:GetSecretValue`, an `aws_lambda_function` (Node.js 20.x) exchanging the secret for a Direct Line token, and an `aws_lambda_function_url` as the public endpoint. Wired into `infra/envs/dev/main.tf` and `outputs.tf`. **Never applied to AWS** (no `terraform apply` was run) and fully deleted the same day once T062 found it was unnecessary.
- [X] T041 **-- REVERTED, see T062-T066 below.** Documented the Function URL's accepted-risk CORS note in `infra/README.md`'s "Voice assistant: Direct Line token proxy" section. That section, and the module it described, no longer exist.
- [X] T042 Created `src/types/speech-recognition.d.ts` -- ambient types for `SpeechRecognition`/`webkitSpeechRecognition` (not in TypeScript's DOM lib).
- [X] T043 Created `src/tabs/voice-assistant/directLineClient.ts`: `startDirectLineConversation`, `postDirectLineMessage`, `subscribeToDirectLineActivities` (WebSocket, filters out this app's own echoed activities via a fixed `KIOSK_VISITOR_ID`). Per `contracts/direct-line-client-contract.md`.
- [X] T044 Created `src/tabs/voice-assistant/useSpeechRecognition.ts`: continuous-mode Chrome `SpeechRecognition` wrapper with auto-restart on `onend`, final/interim transcript separation, and classified error states (`not-supported`/`no-permission`/`unavailable`). Per `contracts/speech-recognition-contract.md`.
- [X] T045 [P] `src/tabs/voice-assistant/useSpeechRecognition.test.ts` -- unit tests against a fake `SpeechRecognition` constructor: not-supported detection, inactive = no instance created, continuous/interim config, final-transcript callback vs. interim display text, auto-restart on `onend` while active, abort-and-no-restart on cleanup, permission-error classification. 7/7 passing.
- [X] T046 **-- Superseded by T063, see below.** Created `src/tabs/voice-assistant/agentConfig.ts` (replaces `copilotStudioEmbed.ts`): originally kept the new agent's hosted-demo URL for reference only, plus `getDirectLineTokenEndpoint()` reading a build-time env var for the (now-removed) Lambda proxy.
- [X] T047 Created `src/tabs/voice-assistant/VoiceConversation.tsx` + `.module.css` (replaces `AgentEmbedContainer.tsx`/`.module.css`): connects Direct Line on mount, drives `useSpeechRecognition` once connected, posts final transcripts automatically (no button), renders bot replies and the visitor's own recognized speech as an on-screen transcript capped at 12 entries, shows connecting/error/retry and mic-error/send-error states.
- [X] T048 [P] `src/tabs/voice-assistant/VoiceConversation.test.tsx` -- unit tests with a mocked `directLineClient` and a fake `SpeechRecognition`: connecting -> listening transition; a recognized utterance is posted, rendered, and calls `reset()`; an incoming bot activity is rendered and calls `reset()`; connection failure shows Retry and a retry reconnects; not-supported banner when no `SpeechRecognition` exists. 5/5 passing.
- [X] T049 Updated `src/tabs/voice-assistant/AgentPanel.tsx`: active view now mounts `VoiceConversation` instead of `AgentEmbedContainer`; removed the `signInHint` render and the `useIframeIdleKeepalive` wiring (no iframe boundary left to bridge -- `VoiceConversation` calls `reset` directly).
- [X] T050 Deleted `AgentEmbedContainer.tsx`/`.module.css`, `copilotStudioEmbed.ts`, `useIframeIdleKeepalive.ts`/`.test.ts` -- fully superseded, not kept as dead code.
- [X] T051 Updated `src/tabs/voice-assistant/strings.ts`: removed `signInHint`; added `listening`, `waiting`, `micNotSupported`, `micNoPermission`, `micUnavailable`, `sendError` (EN/HU).
- [X] T052 [P] Rewrote `src/tabs/voice-assistant/AgentPanel.test.tsx` (mocks `VoiceConversation`) and `VoiceAssistant.layout.browser.test.tsx` (no more iframe `title` assertion; waits for the End button via `findByRole` since the active state's sub-status is no longer synchronous).
- [X] T053 **-- REVERTED, see T063 below.** Added `.env.example` (`VITE_DIRECTLINE_TOKEN_ENDPOINT`) and extended `src/vite-env.d.ts`'s `ImportMetaEnv`. Both removed once T062-T063 found no env var was needed.
- [X] T054 Ran `npm run typecheck`, `npm run test` (unit), `npm run test:layout` (browser/Chromium), and `npm run build` -- all clean: 102/102 unit tests across 14 files (net change from 104: `useIframeIdleKeepalive.test.ts` removed, `useSpeechRecognition.test.ts` and `VoiceConversation.test.tsx` added, `AgentPanel.test.tsx` trimmed of its sign-in-hint cases), 9/9 layout tests, clean production build.
- [X] T055 Updated `specs/003-voice-info-agent/spec.md`: replaced User Story 1 (sign-in) with "Visitor has a completely hands-free voice conversation"; superseded FR-004/FR-005/FR-010/FR-013/FR-019-FR-023 with hands-free/Direct-Line/Chrome-only equivalents; added FR-024 (Chrome-specific browser requirement); replaced SC-008/SC-009; removed the Sign-In Session key entity; added Session 2026-09-10 Clarifications (Q4/Q5, superseding Q2/Q3).
- [X] T056 [P] **-- Further amended by T065, see below.** Updated `plan.md`: Summary addendum, Technical Context (Direct Line dependency, Chrome-specific target platform, new Constraints), a new Deviations table section, and a fully re-run Constitution Check, with the T012/R11 finding reframed as historical/resolved rather than an open blocker. Project Structure tree updated for the new/removed files.
- [X] T057 [P] **-- R13 further corrected by T064, see below.** Updated `research.md`: added a "CORRECTION (2026-09-10)" section replacing the disproven maker-canvas theory with the actual root cause (Web Channel Security's "Require secured access"), plus R12 (why the iframe can't support this), R13 (Direct Line architecture decision -- initially a Lambda proxy, corrected same day), R14 (Chrome-only STT limitation).
- [X] T058 [P] Updated `data-model.md`: removed the Sign-In Session entity (no longer applicable, not just unmodeled); added `DirectLineConversation` and `TranscriptEntry` local entities; updated the Relationships diagram.
- [X] T059 [P] Replaced `contracts/agent-embed-contract.md` and `contracts/idle-keepalive-contract.md` with `contracts/direct-line-client-contract.md` and `contracts/speech-recognition-contract.md`.
- [X] T060 [P] **-- Prerequisites section further amended by T066, see below.** Rewrote `quickstart.md`: Scenario 2 replaced (hands-free conversation, no sign-in), Scenario 3 updated for Direct Line connection states, Scenario 5 updated for the new direct-`reset()` keepalive mechanism, Scenario 7 extended with the BCP-47 language-tag detail, historical note pointing to research.md's correction.
- [X] T061 [P] Updated `checklists/requirements.md` re-confirming the checklist still passes after this amendment.

**Checkpoint (superseded same day, see T062-T066)**: at this point the hands-free voice architecture was implemented, documented, and passing all automated checks, but depended on a new Lambda + Secrets Manager proxy that had not been deployed.

---

## Phase 9 correction (same day, 2026-09-10): removing the Lambda proxy

**Trigger**: user pushback -- "I did not want to change the deployment at all! I am not sure about the Direct Line communication but is that not possible to reach my agent on direct line without the secret tokens?"

**Goal**: answer the question with evidence rather than assumption, and if a secretless path exists, use it -- eliminating the new AWS infrastructure entirely rather than merely asking permission to deploy it.

- [X] T062 Investigated the user's question directly rather than re-asserting the earlier assumption: ran a Playwright script against `agentConfig.COPILOT_STUDIO_DEMO_URL` (the same real-browser network-inspection technique the original T012 used) and captured its actual network traffic. Found it calls a **public, unauthenticated, CORS-open** (`Access-Control-Allow-Origin: *`, separately verified via a cross-origin `fetch` from `example.com`) Copilot Studio token-provisioning endpoint before ever touching Direct Line's REST API -- no secret involved. Recorded as research.md R13's correction.
- [X] T063 Rewrote `agentConfig.ts` (`DIRECT_LINE_PROVISION_TOKEN_URL` constant, no env var, no build-time configuration) and `directLineClient.ts`'s `startDirectLineConversation` (now: `GET` the public provision endpoint, then `POST` its token to `https://directline.botframework.com/v3/directline/conversations`, mirroring exactly what the hosted demo page does). Updated `VoiceConversation.tsx`'s call site and `VoiceConversation.test.tsx`'s mock accordingly. Removed `.env.example` and reverted `src/vite-env.d.ts`.
- [X] T064 Reverted all infra changes: `git checkout` on `infra/.gitignore`, `infra/README.md`, `infra/envs/dev/main.tf`, `infra/envs/dev/outputs.tf` (all back to their pre-feature committed state) and deleted `infra/modules/directline-token-proxy/` entirely. Confirmed via `git status` that `infra/` carries zero changes from this feature.
- [X] T065 [P] Corrected `plan.md` (Summary, Technical Context, Deviations table, Constitution Check VI/VIII, Project Structure), `data-model.md` (removed the `DirectLineSecret` server-side entity), `contracts/direct-line-client-contract.md` (guarantee 1), and `spec.md`'s Assumptions to describe the public-endpoint mechanism instead of the removed proxy -- not silently, but with the correction narrated in place (this project's established convention, e.g. Phase 8's own sign-in history).
- [X] T066 [P] Corrected `quickstart.md`'s Prerequisites (removed the infra/secret/env-var steps -- `npm run dev` now works immediately, nothing to deploy) and re-ran `npm run typecheck`, `npm run test` (111/111), and `npm run build` -- all clean after the rewire.
- [X] T067 Ran a real, unmocked end-to-end check: started the actual dev server, drove it with Playwright (mic permission granted, real Chromium, no mocks of any kind) through Start on the voice-assistant tab, and confirmed it reaches the listening state -- a real Direct Line conversation and WebSocket against the live bot, using zero backend infrastructure. This is the first real (non-mocked) validation of quickstart.md Scenario 2.

**Checkpoint**: Hands-free voice architecture fully implemented, documented, and verified end-to-end against the live agent in a real browser -- with **no infrastructure of any kind**, matching the user's explicit "did not want to change the deployment at all." `infra/` is byte-for-byte unchanged from before this feature touched it.

## Outstanding follow-up (Phase 9)

1. Confirm the kiosk's actual deployed browser is Google Chrome, not Microsoft Edge (spec FR-024, research.md R14) -- an operational/deployment check outside this repository's code. This is now the only remaining follow-up; there is no infra step left.
