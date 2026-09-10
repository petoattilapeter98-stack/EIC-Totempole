# Implementation Plan: Voice Information Assistant

**Branch**: `feat/voice-info-agent` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-voice-info-agent/spec.md`, refined by user planning input: "Use the same UI as the rest of the application, just integrate an extra button to start the agent. The agentic integration will be done through Copilot Studio and HTML — Copilot Studio provided HTML code to integrate the agent — to be supplied later." Amended 2026-09-09: "The agent integrated by copilot is now published with microsoft authentication. What I want to do is have a login possibility to my (or someone's) microsoft account when entering the voice-info-agent. make this a pop-up because the whole functionality is worthless without it. align all the .MD files for this." Amended 2026-09-10: "There is a new copilot agent deployment ... we will deploy the agent without auth ... include voice speech to text ... integrate this with chrome's built in STT ... I do not want the user to have [to] press any button while discussing with the agent ... Could there be a different UI for the conversation and the agent only used in the background? so the request is sent into the chat of the agent, but the voice command is ingested through an input speech UI."

## Summary

Add a fifth entry to the kiosk's existing tab row — `voice-assistant` — built with the exact same `TabModule` pattern as Board Agenda, Local Transit, Company Highlights, and Guest Wi-Fi (spec 001 contract). Its content region shows example prompts and a single "Start Assistant" button.

**Sign-in addendum (2026-09-09) — SUPERSEDED, see below.** The 2026-09-09 amendment (this paragraph, kept verbatim as a historical record) had tapping Start mount a Microsoft Copilot Studio agent embed — Microsoft's own hosted webchat iframe — and, because that agent required Microsoft account sign-in, relied on Bot Framework Web Chat's own OAuthCard mechanism to open a sign-in popup from inside the iframe, with a documented narrow exception to Constitution Principle IV.

**Hands-free voice architecture (2026-09-10, current design)**: the agent was re-deployed with sign-in no longer required, and the user asked for a genuinely hands-free experience — no visible chat, no per-question button, voice in and text out. Microsoft's hosted webchat iframe cannot support that: it is a cross-origin page with no scriptable API (`research.md` R3/R12 — no `postMessage` was ever observed from it), so there is no way for this app to inject a voice-recognized utterance into its input box. Tapping Start now instead mounts `VoiceConversation`, which:

1. Connects directly to the bot's own **Direct Line channel** (the same Bot Framework channel the hosted webchat page was using internally all along) via this app's own client (`directLineClient.ts`), obtaining a short-lived token by calling a **public, unauthenticated, CORS-open** provisioning endpoint (`agentConfig.DIRECT_LINE_PROVISION_TOKEN_URL`) directly from the browser — the same endpoint Copilot Studio's own hosted demo page calls internally. No secret exists anywhere in this flow (research.md R13).
2. Listens continuously via Chrome's built-in `SpeechRecognition` (`useSpeechRecognition.ts`) for as long as the panel is active — no push-to-talk, no per-turn control (spec FR-004, User Story 1).
3. Posts each recognized utterance as a Direct Line message activity automatically, and renders the bot's replies as on-screen transcript text (spec FR-005) — no synthesized speech in this iteration.

No third-party iframe is embedded by this design at all, so **the sign-in-popup exception from 2026-09-09 no longer applies to this feature** — Constitution Principle IV's popup exception is now unused here (still available in the constitution for a future feature that might need it).

**Correction (2026-09-10, same day)**: an earlier version of this plan additionally proposed a server-side Lambda + Secrets Manager token-exchange proxy (new AWS infrastructure), on the mistaken assumption that Direct Line always requires a secret. The user objected ("I did not want to change the deployment at all") and asked directly whether the agent was reachable without one — it is (see point 1 above and research.md R13's correction). That proxy was never deployed (no `terraform apply` was run) and has been fully removed from this repository. **This feature introduces zero new infrastructure and zero new deployment surface** — it is exactly what it was before this correction: a change to the static frontend bundle only.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19, targeting ES2022 — unchanged from spec 001.

**Primary Dependencies**: No new build-time npm dependency, and — after the correction above — **no new infrastructure of any kind**. `directLineClient.ts` talks to the standard Bot Framework Direct Line 3.0 REST/WebSocket API directly (`fetch` + native `WebSocket`), obtaining its token from a public endpoint Copilot Studio itself exposes (`agentConfig.DIRECT_LINE_PROVISION_TOKEN_URL`) rather than from any component this repository deploys. `useSpeechRecognition.ts` wraps the browser's built-in `webkitSpeechRecognition`. Reuses `lucide-react` (icon: `Mic`) already in `package.json`.

**Storage**: N/A in this codebase. No conversation data is persisted client-side; a transcript is held only in React state, capped at 12 entries (Constitution V: no unbounded growth), and discarded on unmount (spec FR-012). No credential is held anywhere, client- or server-side — there is none to hold (research.md R13).

**Testing**: Vitest 3.x + React Testing Library (jsdom) for `useSpeechRecognition` (fake `SpeechRecognition` constructor), `VoiceConversation` (mocked `directLineClient`), and `AgentPanel` (idle/active state machine, i18n). The existing Playwright browser-mode project (spec 001 research.md R6) is extended to cover this tab's no-scroll assertion for both states. Real Direct Line connectivity and actual speech-recognition accuracy are **not unit-testable** from this codebase — validated manually per quickstart.md against the real agent and a real Chrome instance.

**Target Platform**: Microsoft Surface Hub 2S, 1920×1280 CSS px design viewport, touch-only. **Changed 2026-09-10**: the browser MUST specifically be **Google Chrome**, not Microsoft Edge — research.md's finding is that Edge's Chromium engine does not include the speech-recognition backend Chrome's `SpeechRecognition` API depends on, so this feature (though nothing else in the kiosk) would silently not work on Edge. This narrows spec 001's more general "Edge/Chromium" language for this feature only.

**Project Type**: Static single-page frontend application — **fully unchanged** from spec 001's shape. No backend component of any kind (see the 2026-09-10 correction above).

**Performance Goals**: Tab switch to this tab is instant, same budget as existing tabs (spec 001). Tapping "Start Assistant" MUST show a connecting state within one frame; the Direct Line connection and Chrome's grant-microphone-permission prompt (first use only) may take longer over the network, which is acceptable and outside this app's control.

**Constraints**: All of spec 001's shell constraints apply unchanged (no scroll, ≥64px touch targets, unattended multi-day reliability, zero client-side secrets, WCAG AA for chrome we own). **Changed 2026-09-10**: this feature now has **zero popups of any kind** — the 2026-09-09 sign-in popup exception (Constitution IV) is unused by this feature (the constitution keeps the exception itself, unused, for any future feature that might need it). The voice conversation UI (transcript, listening indicator) MUST render inline, fixed-size within the content region, matching every other tab.

**Scale/Scope**: One tab folder (`src/tabs/voice-assistant/`), a Direct Line REST/WebSocket client, a speech-recognition hook, 3 example prompts × 2 locales, ~8 new tab-owned strings (EN/HU). No client-side routes, no new persisted client entities, no new infrastructure, no credential of any kind (Constitution VI is satisfied because there is nothing to protect).

### Deviations from the supplied technical input

| Spec/input said | Plan does | Why |
|---|---|---|
| Spec Assumptions: "multi-agent" is our own backend routing questions to specialized handlers per domain (spec FR-003, FR-018) | All question-answering, routing, and knowledge-domain logic is delegated entirely to the Microsoft Copilot Studio agent referenced by the (pending) embed snippet; this codebase builds no STT/TTS/routing logic of its own | The planning input explicitly directs the integration through Copilot Studio's provided HTML rather than a custom backend. The "multi-agent" behavior spec.md describes is realized inside Copilot Studio, invisible to this codebase, exactly as spec.md's own Assumptions anticipated ("the internal agent architecture is a planning/implementation decision, not a spec-level requirement") |
| Spec FR-004: visitor starts/stops listening via a push-to-talk control this app implements | This app's own control is a single "Start Assistant" button that mounts the embed; once mounted, listening/push-to-talk (or the embed's own input affordances) are provided by Copilot Studio's UI inside the embed, not built here | The user's planning input asks for "an extra button to start the agent" — the button is the mount trigger, not a raw mic-capture control. Building our own push-to-talk on top of an opaque embedded widget would double up on a control the widget already provides |
| Spec FR-002/FR-005/FR-010: this app captures speech, detects silence/errors, and renders captions | These behaviors are the embedded agent's responsibility once mounted; this app is only responsible for the mount/unmount lifecycle, container sizing (so captions never cause outer-page scroll), and its own "couldn't connect" fallback if the embed fails to load | We do not control or reimplement a third party's internal STT/TTS pipeline; our job is containment and graceful degradation at the boundary |
| Spec FR-013: no secret in client bundle | Verified directly against the supplied embed URL (research.md R4) — no secret present, PASS | Confirmed rather than assumed, once the actual HTML existed to inspect |
| Spec FR-011/FR-012: idle-countdown interaction / conversation clearing | Implemented via a focus-based keepalive heuristic (R5) and full React unmount-on-tab-switch (R6) rather than any cooperation from inside the embed | Cross-origin iframe content cannot be inspected or instrumented directly; these are the strongest guarantees achievable without support from the (unknown) embed's own event API |
| Original Constitution IV: zero popups, no exceptions | A single, narrowly-scoped popup is now permitted for Microsoft sign-in only (FR-020, spec Clarifications amendment) | The user directed this explicitly ("make this a pop-up because the whole functionality is worthless without it") after the agent was published requiring Microsoft auth; verified empirically (`curl` against `login.microsoftonline.com/common/oauth2/v2.0/authorize`, 2026-09-09) that Microsoft's sign-in page sends `X-Frame-Options: DENY`, so inline authentication is not a design choice being skipped — it is technically impossible. Constitution amended to v1.1.0 with a narrow, guarded exception rather than silently violating Principle IV |

**Rows above marked "delegated entirely to the embed" (originally rows for FR-004, FR-002/FR-005/FR-010) are SUPERSEDED as of 2026-09-10** — kept verbatim above as a historical record of the 2026-09-09 design, not the current one. New rows for the current design:

| Spec/input said (2026-09-10) | Plan does | Why |
|---|---|---|
| User: "the voice command is ingested through an input speech UI" and "I do not want the user to have [to] press any button while discussing with the agent" | This app now implements its own continuous speech capture (`useSpeechRecognition.ts`, Chrome's `SpeechRecognition`) instead of delegating to an embedded widget's own input affordances | There is no embedded widget anymore to delegate to (see Summary) — and even if there still were, an embed's own UI cannot satisfy "no button" without this app driving input itself |
| User: "the agent only used in the background" / "the request is sent into the chat of the agent" | This app talks to the bot's Direct Line channel directly (`directLineClient.ts`), never rendering the bot's own chat UI at all — replies are rendered in this app's own transcript view | The only way to keep the agent invisible while still exchanging real messages with it is to stop embedding its UI and instead drive its actual protocol (Direct Line) ourselves |
| Constitution VI (no client secret) / VIII (static-first) | No new infra: `directLineClient.ts` calls Copilot Studio's own public, secretless token-provisioning endpoint directly from the browser — the bundle stays 100% static, no backend of any kind | This is the actual mechanism Copilot Studio's own hosted demo page uses (observed via network inspection, research.md R13) for a bot configured without required authentication — not a workaround, the supported no-auth integration point |
| Spec FR-005 (2026-09-09 text): spoken TTS + captions | Text-only replies (FR-005, 2026-09-10 text) | Resolved by a clarifying question this session; the user chose text-only over TTS+captions or TTS-only |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.1.0, scoped to this feature's delta over spec 001 (already-passing shell behavior is not re-litigated). **Re-run 2026-09-10** for the hands-free/Direct Line pivot, and **re-run again the same day** after correcting the Direct Line integration to use Copilot Studio's public token endpoint instead of a Lambda proxy (research.md R13) — no constitution amendment was needed for either revision: Principle IV's popup exception is simply unused now rather than needing to be revoked, and Principles VI/VIII pass more cleanly than initially thought, with no exception invoked at all.

| # | Principle | Gate | Status |
|---|---|---|---|
| I | Kiosk-First Hardware Target | Touch-only; no hover-revealed content; no hardware keyboard required | **PASS** — Start/End and example prompts are always visible (no hover reveal); no on-screen keyboard is used anywhere in this feature (no text input exists — voice only) |
| II | Fixed 3:2 Viewport, No Vertical Scroll | No outer-page scroll in any state | **PASS** — the transcript view is a fixed-size box within the existing `1fr` content region, capped at 12 entries with its own internal `overflow-y: auto`; verified by the extended browser-mode layout test |
| III | Minimum Touch Target Sizing | ≥64×64px, ≥16px separation | **PASS** — Start/End use the existing `--touch-target-min` / `--touch-gap-min` tokens; no other interactive control exists in this feature (the entire point of FR-004) |
| IV | Single-Page, Inline-Only Updates | No modal, popup, or route change | **PASS, unconditionally.** This feature opens zero popups. (The 2026-09-09 sign-in popup exception is not exercised — see Summary.) |
| V | Unattended Multi-Day Reliability | Every timer/listener torn down; no unbounded growth | **PASS** — `useSpeechRecognition` aborts its recognizer and clears all handlers on cleanup (`active` false or unmount); `directLineClient`'s WebSocket subscription returns an explicit unsubscribe closing the socket, called from `VoiceConversation`'s effect cleanup; the transcript array is capped at 12 entries |
| VI | Zero Secrets in the Client Bundle | No credential in client code/config | **PASS — trivially, not via a proxy.** There is no credential anywhere in this feature: speech recognition is entirely client-side, and the bot's Direct Line token is obtained from a public, unauthenticated endpoint Copilot Studio itself exposes for this "no required authentication" bot (`agentConfig.DIRECT_LINE_PROVISION_TOKEN_URL`, verified `Access-Control-Allow-Origin: *`). Nothing is hidden server-side because nothing needs to be |
| VII | Accessibility Baseline | WCAG AA, keyboard reachable, screen-reader labelled | **PASS for chrome we own** — Start/End have `aria-label`s, keyboard-focusable, meet contrast tokens; the transcript region uses `aria-live="polite"` so screen readers announce new turns. **Known limitation**: there is no keyboard-accessible equivalent to speaking a question — a visitor who cannot use voice input has no alternative path in this feature, same limitation class as spec 001's touch-only design |
| VIII | Static-First Delivery | Serve statically unless server-side state/computation/credentials are genuinely required | **PASS, unconditionally — no exception needed.** No server-side credential handling exists in this feature (research.md R13's correction); the kiosk's own bundle is, and remains, 100% static, exactly like every other tab |
| IX | Modular Feature Isolation | Removable without touching other features | **PASS** — `src/tabs/voice-assistant/` plus one `registry.ts` line (unchanged from before); no infra of any kind exists for this feature to entangle with anything else |

**Result: 9/9 PASS**, with IV now passing unconditionally (no exception invoked) rather than under the 2026-09-09 guarded exception.

### Historical: T012/R11 findings and the 2026-09-09 sign-in design — resolved by the 2026-09-10 re-deployment

The 2026-09-09 amendment's open blocker ("You don't have access to talk to this bot, contact the owner" — research.md T012/R11) is now understood, not just resolved by luck: it was the bot's **Web Channel Security "Require secured access"** setting rejecting this kiosk's unauthenticated caller — not, as originally hypothesized, a maker/test-canvas-link limitation (research.md R3 is corrected accordingly). The user re-deployed the agent with that setting OFF, which is what makes the current no-sign-in design work. The full 2026-09-09 sign-in popup architecture (OAuthCard, `window.open()`, the `X-Frame-Options: DENY` finding) remains accurate history for *if* a future agent redeployment ever re-requires sign-in, but is not exercised by the current design.

**Post-Phase-1 re-check**: re-evaluated after this 2026-09-10 pivot (new data-model.md entities, new contracts/, real `npm run typecheck`/`test`/`test:layout`/`build` all passing against the new implementation), and again after correcting the Direct Line integration away from the Lambda proxy. No new dependency, infrastructure, or persisted state exists in the final design — no Constitution-relevant change beyond IV's exception going unused.

## Project Structure

### Documentation (this feature)

```text
specs/003-voice-info-agent/
├── plan.md                                    # This file (/speckit-plan command output)
├── spec.md                                    # Feature specification (/speckit-specify)
├── research.md                                # Phase 0 output (/speckit-plan command)
├── data-model.md                              # Phase 1 output (/speckit-plan command)
├── quickstart.md                              # Phase 1 output (/speckit-plan command)
├── contracts/                                 # Phase 1 output (/speckit-plan command)
│   ├── direct-line-client-contract.md         # What directLineClient.ts guarantees (2026-09-10, replaces agent-embed-contract.md)
│   └── speech-recognition-contract.md         # What useSpeechRecognition.ts guarantees (2026-09-10, replaces idle-keepalive-contract.md)
├── checklists/
│   └── requirements.md                        # Spec quality checklist (/speckit-specify)
└── tasks.md                                   # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
eic-totempole-code/
├── src/
│   ├── types/
│   │   └── speech-recognition.d.ts            # Ambient SpeechRecognition types (not in TS DOM lib)
│   └── tabs/
│       ├── registry.ts                        # +1 line: register voice-assistant (unchanged since 2026-09-09)
│       └── voice-assistant/
│           ├── index.tsx                      # Default export: VoiceAssistant tab component
│           ├── meta.ts                        # id, EN/HU label, Mic icon, accent
│           ├── strings.ts                     # Tab-owned EN/HU copy -- sign-in strings removed, listening/mic-error/send-error strings added (2026-09-10)
│           ├── examplePrompts.ts               # Static 3-domain example question list (FR-016, unchanged)
│           ├── agentConfig.ts                  # COPILOT_STUDIO_DEMO_URL (docs only) + DIRECT_LINE_PROVISION_TOKEN_URL (2026-09-10, replaces copilotStudioEmbed.ts)
│           ├── directLineClient.ts             # Direct Line 3.0 REST + WebSocket client (2026-09-10, new)
│           ├── useSpeechRecognition.ts         # Chrome SpeechRecognition wrapper, continuous mode (2026-09-10, new)
│           ├── useSpeechRecognition.test.ts
│           ├── VoiceConversation.tsx           # Connects Direct Line + speech recognition; renders transcript (2026-09-10, replaces AgentEmbedContainer.tsx)
│           ├── VoiceConversation.module.css
│           ├── VoiceConversation.test.tsx
│           ├── AgentPanel.tsx                  # Idle (prompts + Start) <-> Active (VoiceConversation) state machine
│           ├── AgentPanel.module.css           # Fixed-size container; no outer scroll (Constitution II)
│           ├── AgentPanel.test.tsx             # Idle state, button a11y/touch target, i18n, unmount clears state
│           └── VoiceAssistant.layout.browser.test.tsx  # Extends the existing no-scroll layout check to this tab
```

**No infra directory entry** — deliberately. An earlier revision of this plan added `infra/modules/directline-token-proxy` (a Lambda + Secrets Manager); it was never deployed and has been fully removed after confirming the bot is reachable via a public token endpoint with no secret at all (research.md R13's correction). `infra/` is unchanged from before this feature touched it at all.

**Removed 2026-09-10** (superseded by the files above): `AgentEmbedContainer.tsx`/`.module.css` (the iframe wrapper), `copilotStudioEmbed.ts` (replaced by `agentConfig.ts`), `useIframeIdleKeepalive.ts`/`.test.ts` (the cross-origin focus-heuristic keepalive is no longer needed — `VoiceConversation` calls the shell's `reset()` directly on every recognized utterance and every bot reply, since there is no iframe boundary left to bridge).

**Structure Decision**: Same single static frontend project as spec 001, with **zero new infra** — this feature adds one tab folder and a one-line registry edit (unchanged since 2026-09-09), nothing else. Tests stay colocated with the module they cover, matching the existing repository convention (Constitution IX).

**External input received (2026-09-10)**: the user supplied the new no-auth agent's HTML (`cre88_noauthroutingagent_FUwQYD`). What made the hands-free Direct Line integration possible was not a secret the user supplied, but a public token endpoint discovered by inspecting the hosted demo page's own network traffic — see research.md R12/R13.

**Incidental fix from 2026-09-09** (unchanged, still in effect): `src/components/TabNav/TabNav.module.css`'s nav row uses `display: flex` / `flex: 1 1 0` rather than a hardcoded 4-column grid, so the nav stays tab-count-agnostic.

**Sign-in amendment (2026-09-09)**: no new component files were needed for the sign-in flow itself — Bot Framework Web Chat (inside the iframe) already renders its own sign-in card and owns the popup call. The change is confined to: (1) `strings.ts` gaining a `signInHint` EN/HU string pair, (2) `AgentPanel.tsx`'s active view rendering that hint alongside the embed, and (3) `AgentEmbedContainer.tsx` gaining an explicit code comment recording that no `sandbox` attribute is used, precisely so the embed's internal `window.open()` call is never blocked. `contracts/agent-embed-contract.md` was updated with this as an explicit guarantee. Constitution v1.1.0's exception is what makes this permissible; see the Constitution Check above.

## Complexity Tracking

No Constitution Check violations — table omitted. This feature ends up simpler than its own first draft: no backend, no infrastructure, no credential of any kind.
