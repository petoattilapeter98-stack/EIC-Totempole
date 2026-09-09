# Quickstart: Voice Information Assistant

Validates the tab, panel, and lifecycle behavior described in plan.md.

**Execution status (2026-09-09)**: the real Copilot Studio embed was supplied and wired in during `/speckit-implement`, before any code was written. Scenarios 1, 3, 4, 6, 8 below were executed and pass against the real embed. Scenario 3's "connecting" step surfaced a real finding: the embed loads and connects, but the bot itself refuses the connection ("You don't have access to talk to this bot, contact the owner") — see research.md's T012/R11 findings and plan.md's Constitution Check. This is a Copilot Studio authorization/publishing configuration issue, not a defect in this app. **Amended same day**: the agent was published requiring Microsoft authentication and a sign-in popup capability was added (Scenario 2); retesting showed the *same* denial as before, before any sign-in prompt is ever reached — see Scenario 2's executed result.

## Prerequisites

- Node/npm installed, repo dependencies installed (`npm install`).
- On `feat/voice-info-agent` (or a branch built from it) with this feature's tasks implemented.

## Run the app

```sh
npm run dev
```

Open the printed local URL. The kiosk shell loads with Board Agenda active by default (unchanged from spec 001).

## Scenario 1 — Discoverability (FR-016, SC-007)

1. Tap the new tab (Mic icon) in the nav row.
2. **Expect**: content region shows a heading, three example prompts, and a "Start Assistant" button — no embed mounted yet, no page scroll introduced.
3. **Expect**: at least one example prompt visibly relates to each of the three domains (Innovation Centre, company, employees).

## Scenario 2 — Signing in with a Microsoft account (FR-019–FR-023, User Story 1)

1. From the idle state, tap "Start Assistant".
2. **Expect**: a persistent sign-in hint is visible alongside the embed (e.g., "If prompted, a Microsoft sign-in window will open — sign in with the shared kiosk account.") for as long as the panel is active — this app cannot detect the embed's actual auth state, so the hint is always shown while active rather than conditionally (research.md R10, data-model.md).
3. **If** the embedded conversation requests authentication, **expect**: Bot Framework Web Chat renders a "Sign in" message/button in the transcript; tapping it opens a **popup window** to Microsoft's real sign-in page. This is the one deliberate exception to the kiosk's no-popup design (Constitution IV, v1.1.0) — verify nothing else in the kiosk shell (header, nav, footer) changes or navigates away while the popup is open.
4. **Expect**: completing sign-in in the popup closes it and the conversation becomes usable; a follow-up conversation started later (Scenario 4, then Scenario 3 again) does not prompt sign-in again during the same signed-in session (FR-021, SC-008).
5. **Expect**: closing/cancelling the popup without completing sign-in leaves the section clearly still showing sign-in is needed, with a way to retry (FR-023) — not a stuck or broken-looking state.
6. **Executed result (2026-09-09)**: retested against the live embed after the agent was published with Microsoft authentication. The bot still replied "You don't have access to talk to this bot, contact the owner" — identical to the pre-authentication finding — and no sign-in card ever appeared. This confirms the rejection happens at an earlier channel/environment-access check than the bot's own sign-in requirement (research.md R11); steps 2-5 above describe the correct, implemented app-side behavior but have not yet been exercised against a real sign-in prompt because this specific URL never reaches that point.

## Scenario 3 — Starting the assistant (FR-001, FR-002, FR-004)

1. From the idle state, tap "Start Assistant".
2. **Expect**: the button is replaced by the embed container within one frame, showing a connecting/loading indicator, then the live Copilot Studio Web Chat UI.
3. **Executed result (2026-09-09)**: the embed loads and the Web Chat UI renders, but the bot immediately replies "You don't have access to talk to this bot, contact the owner." This is the agent's own authorization check rejecting this caller identity, not a rendering or app defect — see research.md's T012/R11 findings for remediation paths. Until that's fixed on the Copilot Studio side, this is the expected observed behavior.
4. **Expect**: no modal, no unexplained popup, no navigation away from the kiosk's single page (Constitution IV, aside from the documented sign-in exception in Scenario 2) — verify the tab row, header, and footer are all still visible and unchanged. **Confirmed.**
5. **Expect**: the Start button (or its replacement End control) measures ≥64×64 CSS px with ≥16px separation from any adjacent control (Constitution III). **Confirmed via `VoiceAssistant.layout.browser.test.tsx` at the 1920×1280 viewport.**

## Scenario 4 — Ending and returning to idle (FR-008, FR-012)

1. With the panel active (Scenario 3), tap "End".
2. **Expect**: the panel returns to the idle state (example prompts + Start button) inline, no confirmation dialog.
3. Repeat Scenario 3, then instead of tapping End, switch to a different tab and back.
4. **Expect**: the assistant tab is back at idle, not wherever it was left — confirms unmount-based state clearing (research.md R6). The underlying Microsoft sign-in session (Scenario 2) is a separate, longer-lived thing and MUST NOT be affected by this (FR-021) — this app cannot verify that from outside the iframe, but it also never does anything (like reloading the iframe with a cache-buster or clearing cookies) that would threaten it.

## Scenario 5 — Idle countdown does not fire mid-conversation (FR-011)

1. Start the assistant (Scenario 3). Click/focus into the embed container area and leave it focused.
2. Watch the footer countdown (shared shell chrome, spec 001).
3. **Expect**: the countdown does not reach zero and trigger an auto-reset while focus remains in the embed container, even past the normal 60s window — confirms `useIframeIdleKeepalive` (research.md R5) is active.
4. Move focus back out of the embed container (e.g., tap the header) without touching anything else, then stop interacting entirely.
5. **Expect**: the countdown resumes and eventually fires the normal auto-reset (spec 001 FR-019), returning to Board Agenda — confirms the keepalive stops when focus leaves and does not suppress the reset forever.

## Scenario 6 — No scroll at any state (FR-006, SC-004)

Run the automated check:

```sh
npm run test:layout
```

**Expect**: the extended layout assertion (`VoiceAssistant.layout.browser.test.tsx`) passes for both the idle and active states of this tab, at the 1920×1280 kiosk viewport, alongside the existing spec-001 shell assertions. The sign-in hint text (Scenario 2) adds content to the active state but must not introduce scrolling.

## Scenario 7 — Language toggle (FR-015)

1. Open the assistant tab in its idle state. Toggle the header's EN/HU control.
2. **Expect**: the tab's own label, heading, example prompts, button text, and sign-in hint all switch language, exactly like every other tab's chrome (spec 001 FR-007).
3. **Known limitation** (research.md R7): the embedded agent's own conversation language, and Bot Framework Web Chat's own sign-in card text, are not expected to switch with this toggle in this iteration — note as an observed limitation, not a test failure, until the real snippet's language capabilities are known.

## Scenario 8 — Automated unit/hook coverage

```sh
npm run test:unit
```

**Expect**: `AgentPanel.test.tsx` covers idle→active→idle transitions, i18n (including the sign-in hint), and touch-target/a11y attributes; `useIframeIdleKeepalive.test.ts` covers start/stop-on-focus-change and cleanup-on-unmount per `contracts/idle-keepalive-contract.md`.

## User Story 3 / 4 validation notes (company and employee questions)

Not executable yet: since the bot currently denies the calling identity outright before any sign-in prompt (Scenario 2/3 finding), no question of any kind gets a real answer right now, so company-specific and employee-specific question behavior (spec.md US3/US4) could not be validated in this session. Once both the Copilot Studio channel-access issue (research.md T012/R11) and, if still relevant, an actual sign-in prompt are resolved, re-run Scenario 3 and specifically ask one company question and one in-scope/out-of-scope employee question pair to validate US3/US4 and spec.md's Clarifications Q1 (curated employee scope) against the agent's actual configured knowledge content.

## Remaining follow-up: resolve the Copilot Studio access denial

The Constitution Check's originally-conditional items were verified clean once the real HTML arrived (2026-09-09), and Principle IV now passes under the documented, narrow sign-in-popup exception (Constitution v1.1.0):

- Confirmed the embed renders inline, not as a floating launcher, aside from the one documented sign-in popup (Constitution IV). **PASS.**
- Inspected the snippet for any embedded secret/token: none present (Constitution VI). **PASS.**
- Confirmed Microsoft's real sign-in endpoint sends `X-Frame-Options: DENY` (verified via `curl`, 2026-09-09), justifying the popup exception as a technical necessity rather than a convenience choice.

What's still open is not a code task: the agent itself denies this caller before any sign-in step is reached ("You don't have access to talk to this bot, contact the owner" — research.md T012/R11 findings). Once whoever administers this Copilot Studio environment resolves the underlying channel/environment access problem (most likely: publish via the "Custom website" channel rather than the maker/test canvas link currently used), re-run Scenario 2 to see and validate the actual Microsoft sign-in popup, then Scenario 3 to confirm a real conversation, then manually validate spec.md's SC-001–SC-003 and SC-008–SC-009 against a representative question set and a full signed-in day of use — these depend on the live agent's actual configuration and cannot be exercised by this repository's automated tests.
