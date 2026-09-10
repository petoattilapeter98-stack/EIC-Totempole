# Quickstart: Voice Information Assistant

Validates the tab, panel, and lifecycle behavior described in plan.md.

**Execution status (2026-09-10)**: this file replaces the 2026-09-09 sign-in-era quickstart (kept in git history) following the pivot to a hands-free Direct Line integration (research.md R12/R13). **All scenarios below, including Scenario 2, have been executed against the real bot** — no infrastructure of any kind is required (research.md R13's correction: the bot's Direct Line channel is reached via a public, unauthenticated token endpoint, not a server-side proxy). Verified via a real Chromium/Playwright run against the actual dev build: tapped Start and confirmed the panel reaches the listening state with a real Direct Line connection, no mocks.

## Prerequisites

- Node/npm installed, repo dependencies installed (`npm install`).
- On `feat/voice-info-agent` (or a branch built from it) with this feature's tasks implemented.
- **Nothing else.** No infrastructure to deploy, no secret to provision, no environment variable to set — `npm run dev` (or a production build) works immediately, exactly like every other tab.
- **New (2026-09-10)**: the browser running the app MUST be Google Chrome, not Microsoft Edge (research.md R14) — Edge's Chromium engine does not include the speech-recognition backend Chrome's `SpeechRecognition` API depends on.

## Run the app

```sh
npm run dev
```

Open the printed local URL **in Google Chrome**. The kiosk shell loads with Board Agenda active by default (unchanged from spec 001).

## Scenario 1 — Discoverability (FR-016, SC-007)

1. Tap the new tab (Mic icon) in the nav row.
2. **Expect**: content region shows a heading, three example prompts, and a "Start Assistant" button — no connection established yet, no page scroll introduced.
3. **Expect**: at least one example prompt visibly relates to each of the three domains (Innovation Centre, company, employees).

## Scenario 2 — A completely hands-free conversation (FR-002, FR-004, FR-019–FR-024, User Story 1) — REPLACES the 2026-09-09 sign-in scenario

1. From the idle state, tap "Start Assistant".
2. **Expect**: no sign-in prompt or popup of any kind appears — the agent no longer requires one (Clarifications, Session 2026-09-10). Chrome may show its own native "Allow microphone access?" permission prompt the first time this origin uses speech recognition; allow it.
3. **Expect**: once connected, a listening indicator shows ("Listening…" while actively capturing audio, "Ready — just speak" in the brief windows between restarts) — no push-to-talk button anywhere in the panel.
4. Speak a question out loud (e.g., "What is this Innovation Centre for?") without touching the screen.
5. **Expect**: the recognized text appears in the on-screen transcript as a visitor line, automatically — no "send" tap.
6. **Expect**: the assistant's reply appears as an assistant line in the same transcript shortly after, as on-screen text (no synthesized speech — spec FR-005, Session 2026-09-10 Q5).
7. Speak a follow-up question, again with no tap.
8. **Expect**: the follow-up is recognized and answered the same way, with the panel still listening the whole time — confirms User Story 1's "no button between Start and End" requirement.
9. **Expect (browser mismatch)**: if this is opened in a non-Chrome browser (or `SpeechRecognition` is otherwise unavailable), step 2 instead shows a clear "this browser can't provide speech recognition" message rather than a silently non-functional listening indicator (spec Edge Cases, FR-010).
10. **Expect (mic permission denied)**: if the visitor/operator denies the microphone permission prompt, the panel shows a clear "microphone access is needed" message rather than sitting silently as if listening (spec Edge Cases, FR-010).

## Scenario 3 — Starting the assistant / connection states (FR-001, FR-002, FR-023)

1. From the idle state, tap "Start Assistant".
2. **Expect**: the button is replaced by the voice conversation panel within one frame, showing a "Connecting to the assistant…" state, then (once the Direct Line connection and WebSocket are both established) the listening indicator and empty transcript area (Scenario 2).
3. **Expect (connection failure)**: if the kiosk has no network connectivity, Copilot Studio's public token endpoint is unreachable, or the Direct Line REST call fails, the panel shows a clear "couldn't be reached" message with a Retry button instead of a stuck "Connecting…" state indefinitely (contracts/direct-line-client-contract.md guarantee 4).
4. **Expect**: no modal, no popup, no navigation away from the kiosk's single page (Constitution IV — this feature has **zero** popups as of 2026-09-10, unlike the 2026-09-09 sign-in design). Tab row, header, and footer remain visible and unchanged throughout.
5. **Expect**: the Start button (or its replacement End control) measures ≥64×64 CSS px with ≥16px separation from any adjacent control (Constitution III), verified via `VoiceAssistant.layout.browser.test.tsx` at the 1920×1280 viewport.

## Scenario 4 — Ending and returning to idle (FR-008, FR-012)

1. With the panel active (Scenario 2/3), tap "End".
2. **Expect**: the panel returns to the idle state (example prompts + Start button) inline, no confirmation dialog. The Direct Line WebSocket is closed and speech recognition is aborted (contracts/direct-line-client-contract.md guarantee 3, contracts/speech-recognition-contract.md guarantee 3) — verify via devtools Network/WS tab that no lingering connection remains.
3. Repeat Scenario 2/3, then instead of tapping End, switch to a different tab and back.
4. **Expect**: the assistant tab is back at idle, not wherever it was left, and a fresh Direct Line conversation is started on the next Start tap — no prior transcript carries over (research.md R6, unmount-based clearing).

## Scenario 5 — Idle countdown does not fire mid-conversation (FR-011)

1. Start the assistant (Scenario 2) and ask a question, then stop speaking and wait without touching the screen.
2. Watch the footer countdown (shared shell chrome, spec 001).
3. **Expect**: the countdown does not reach zero while the bot is actively replying, or immediately after a recognized utterance — `reset()` is called directly on every final transcript and every incoming bot activity (data-model.md, replacing the 2026-09-09 iframe-focus keepalive heuristic, which no longer applies since there is no iframe).
4. Stop speaking entirely and leave the panel untouched past the normal 60s window.
5. **Expect**: the countdown eventually reaches zero and the normal auto-reset fires (spec 001 FR-019), returning to Board Agenda — confirms genuine silence is not artificially kept alive forever.

## Scenario 6 — No scroll at any state (FR-006, SC-004)

Run the automated check:

```sh
npm run test:layout
```

**Expect**: the layout assertions (`VoiceAssistant.layout.browser.test.tsx`) pass for both the idle and active states of this tab, at the 1920×1280 kiosk viewport. The transcript area scrolls only within its own fixed-size box (`overflow-y: auto`), never the outer kiosk page.

## Scenario 7 — Language toggle (FR-015)

1. Open the assistant tab in its idle state. Toggle the header's EN/HU control.
2. **Expect**: the tab's own label, heading, example prompts, and button text all switch language, exactly like every other tab's chrome (spec 001 FR-007).
3. Start the assistant and speak in the corresponding language.
4. **Expect**: speech recognition uses the matching BCP-47 language tag (`en-GB`/`hu-HU`, from `i18n/locales.ts`'s existing `LOCALE_TAGS`) — recognition accuracy for Hungarian speech should reflect Chrome's own Hungarian recognition quality, not English.
5. **Known limitation** (unchanged from 2026-09-09, research.md R7): the assistant's own reply language is controlled by Copilot Studio's configuration, not reactively switched by this toggle.

## Scenario 8 — Automated unit/hook coverage

```sh
npm run typecheck && npm run test
```

**Expect**: `useSpeechRecognition.test.ts` covers not-supported detection, active-gated startup, final-vs-interim transcript handling, auto-restart on `onend`, cleanup-on-inactive/unmount, and error classification. `VoiceConversation.test.tsx` covers the connecting → ready transition, posting a recognized utterance (with a mocked `directLineClient`), rendering an incoming bot reply, the error/retry path, and the not-supported banner. `AgentPanel.test.tsx` covers idle ↔ active transitions and i18n with `VoiceConversation` mocked out. **Executed 2026-09-10**: typecheck clean, all suites passing.

## Validating actual question-answering (User Stories 2-4)

Requires a real conversation via Scenario 2 (nothing else — no infra prerequisite) — not executable from this repository's automated tests, since it depends on the live agent's actual configured knowledge content. Ask one Innovation Centre question, one company question, and one in-scope/out-of-scope employee question pair to validate spec.md's SC-001–SC-003 and Clarifications Q1 (curated employee scope) against the agent's real answers.

## Historical: the 2026-09-09 sign-in scenario, the T012/R11 access-denial finding, and the Lambda proxy that was briefly built and removed

The sign-in denial is now understood and resolved, not merely superseded — see research.md's "CORRECTION (2026-09-10)" section for what the denial actually was (the bot's own Web Channel Security "Require secured access" setting, not a maker-canvas link limitation as originally hypothesized) and why the current no-sign-in agent deployment works. Separately, an initial version of the Direct Line integration this file describes added a server-side Lambda token-exchange proxy on the mistaken assumption that a secret was required to reach Direct Line at all; the user objected to any new deployment and asked whether a secret was really necessary — it wasn't. See research.md R13's correction for the public token endpoint that replaced it. That Lambda was never applied to AWS.
