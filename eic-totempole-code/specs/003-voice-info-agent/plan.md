# Implementation Plan: Voice Information Assistant

**Branch**: `feat/voice-info-agent` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-voice-info-agent/spec.md`, refined by user planning input: "Use the same UI as the rest of the application, just integrate an extra button to start the agent. The agentic integration will be done through Copilot Studio and HTML — Copilot Studio provided HTML code to integrate the agent — to be supplied later." Amended 2026-09-09: "The agent integrated by copilot is now published with microsoft authentication. What I want to do is have a login possibility to my (or someone's) microsoft account when entering the voice-info-agent. make this a pop-up because the whole functionality is worthless without it. align all the .MD files for this."

## Summary

Add a fifth entry to the kiosk's existing tab row — `voice-assistant` — built with the exact same `TabModule` pattern as Board Agenda, Local Transit, Company Highlights, and Guest Wi-Fi (spec 001 contract). Its content region shows example prompts and a single "Start Assistant" button; tapping it mounts a Microsoft Copilot Studio agent embed inline, contained in an isolated boundary so the third-party code cannot leak listeners, globals, or state into the rest of the kiosk.

**Sign-in addendum (2026-09-09)**: the published agent now requires Microsoft account sign-in before it will converse at all. Bot Framework Web Chat (running inside the Copilot Studio iframe) handles this natively via its own OAuthCard mechanism — it renders a "Sign in" message with a button, and clicking it calls `window.open()` from inside the iframe to open Microsoft's real sign-in page in a popup. This app does not (and structurally cannot) build its own sign-in UI for this — we're embedding Microsoft's own hosted page, not a Direct Line connection we control end-to-end, so there is no token or code path available to us to intercept or pre-supply. This app's job is: (1) not block that popup (no restrictive iframe `sandbox`), and (2) tell the visitor/operator, in our own chrome, that a Microsoft sign-in popup is the expected behavior — satisfying the spec's "clearly indicate sign-in is required" FRs without needing to detect the opaque, cross-origin iframe's actual auth state. This is now a documented, narrow exception to Constitution Principle IV (no popups) — see the Constitution Check below and Constitution v1.1.0.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19, targeting ES2022 — unchanged from spec 001.

**Primary Dependencies**: No new build-time dependency. Reuses `lucide-react` (new icon: `Mic`) already in `package.json`. The Copilot Studio embed itself is a runtime-loaded, Microsoft-hosted script/iframe referenced by URL in the (pending) provided snippet — not an npm package, not bundled by Vite.

**Storage**: N/A. No conversation data is persisted by this codebase; per research.md R6, the entire conversation lives inside the embedded agent's own iframe and is destroyed with it.

**Testing**: Vitest 3.x + React Testing Library (jsdom) for the tab's own UI (idle state, example prompts, start/stop button, i18n, the focus-based idle-keepalive hook). The existing Playwright browser-mode project (spec 001 research.md R6) is extended to cover this tab's no-scroll assertion. The embedded agent's own behavior (recognition accuracy, answer quality) is **not unit-testable** from this codebase — validated manually per quickstart.md once the real embed is wired in.

**Target Platform**: Same as spec 001 — Microsoft Surface Hub 2S, 1920×1280 CSS px design viewport, Edge/Chromium, touch-only.

**Project Type**: Static single-page frontend application (unchanged) with one new **runtime-only** external dependency (the Copilot Studio-hosted embed, loaded on demand, not at build time) — see Constitution VIII discussion below.

**Performance Goals**: Tab switch to this tab is instant, same budget as existing tabs (spec 001). Tapping "Start Assistant" MUST show a loading/connecting state within one frame; the embed itself may take longer to become interactive over the network, which is acceptable and outside this app's control.

**Constraints**: All of spec 001's shell constraints apply unchanged (no scroll, ≥64px touch targets, unattended multi-day reliability, zero client-side secrets, WCAG AA for chrome we own). The embed itself MUST render inline, at a fixed size inside the content region — never as a floating chat bubble, corner widget, or modal. The **one narrow, documented exception** is the Microsoft sign-in popup (FR-020): it MUST only be reachable via an explicit tap inside the embedded conversation (Bot Framework Web Chat's own sign-in button), MUST NOT be triggered automatically by this app's own code, and this app's `<iframe>` MUST NOT carry a `sandbox` attribute that would block `window.open` from within it (if `sandbox` is ever added for another reason, it MUST include `allow-popups allow-popups-to-escape-sandbox`).

**Scale/Scope**: One new tab folder, one new hook (idle-keepalive across the iframe boundary), the real Copilot Studio embed, 3 example prompts × 2 locales, one sign-in hint string pair (EN/HU). No routes, no new persisted entities. Auth is delegated entirely to Microsoft/Copilot Studio — this app stores no credential, token, or session state of its own (Constitution VI).

### Deviations from the supplied technical input

| Spec/input said | Plan does | Why |
|---|---|---|
| Spec Assumptions: "multi-agent" is our own backend routing questions to specialized handlers per domain (spec FR-003, FR-018) | All question-answering, routing, and knowledge-domain logic is delegated entirely to the Microsoft Copilot Studio agent referenced by the (pending) embed snippet; this codebase builds no STT/TTS/routing logic of its own | The planning input explicitly directs the integration through Copilot Studio's provided HTML rather than a custom backend. The "multi-agent" behavior spec.md describes is realized inside Copilot Studio, invisible to this codebase, exactly as spec.md's own Assumptions anticipated ("the internal agent architecture is a planning/implementation decision, not a spec-level requirement") |
| Spec FR-004: visitor starts/stops listening via a push-to-talk control this app implements | This app's own control is a single "Start Assistant" button that mounts the embed; once mounted, listening/push-to-talk (or the embed's own input affordances) are provided by Copilot Studio's UI inside the embed, not built here | The user's planning input asks for "an extra button to start the agent" — the button is the mount trigger, not a raw mic-capture control. Building our own push-to-talk on top of an opaque embedded widget would double up on a control the widget already provides |
| Spec FR-002/FR-005/FR-010: this app captures speech, detects silence/errors, and renders captions | These behaviors are the embedded agent's responsibility once mounted; this app is only responsible for the mount/unmount lifecycle, container sizing (so captions never cause outer-page scroll), and its own "couldn't connect" fallback if the embed fails to load | We do not control or reimplement a third party's internal STT/TTS pipeline; our job is containment and graceful degradation at the boundary |
| Spec FR-013: no secret in client bundle | Verified directly against the supplied embed URL (research.md R4) — no secret present, PASS | Confirmed rather than assumed, once the actual HTML existed to inspect |
| Spec FR-011/FR-012: idle-countdown interaction / conversation clearing | Implemented via a focus-based keepalive heuristic (R5) and full React unmount-on-tab-switch (R6) rather than any cooperation from inside the embed | Cross-origin iframe content cannot be inspected or instrumented directly; these are the strongest guarantees achievable without support from the (unknown) embed's own event API |
| Original Constitution IV: zero popups, no exceptions | A single, narrowly-scoped popup is now permitted for Microsoft sign-in only (FR-020, spec Clarifications amendment) | The user directed this explicitly ("make this a pop-up because the whole functionality is worthless without it") after the agent was published requiring Microsoft auth; verified empirically (`curl` against `login.microsoftonline.com/common/oauth2/v2.0/authorize`, 2026-09-09) that Microsoft's sign-in page sends `X-Frame-Options: DENY`, so inline authentication is not a design choice being skipped — it is technically impossible. Constitution amended to v1.1.0 with a narrow, guarded exception rather than silently violating Principle IV |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.1.0 (amended 2026-09-09 to add Principle IV's narrow identity sign-in popup exception — see below), scoped to this feature's delta over spec 001 (already-passing shell behavior is not re-litigated).

| # | Principle | Gate | Status |
|---|---|---|---|
| I | Kiosk-First Hardware Target | Touch-only; no hover-revealed content; no hardware keyboard required | **PASS** — the Start/Stop button and example prompts are always visible (no hover reveal); any on-screen keyboard is the embed's own explicit text-input fallback, the same exception spec 001 already allows for on-screen forms |
| II | Fixed 3:2 Viewport, No Vertical Scroll | No outer-page scroll in any state | **PASS** — the embed renders inside a fixed-size box within the existing `1fr` content region; any internal scrolling of the embed's own transcript is contained within that box, not the kiosk page (verified by extending the existing browser-mode layout test to this tab) |
| III | Minimum Touch Target Sizing | ≥64×64px, ≥16px separation | **PASS** — Start/Stop button uses the existing `--touch-target-min` / `--touch-gap-min` tokens, same as every other interactive shell element |
| IV | Single-Page, Inline-Only Updates | No modal, popup, or route change, except the constitution's narrow identity sign-in exception (v1.1.0) | **PASS, under the documented exception.** The embed itself is a plain `<iframe style="width:100%;height:100%;border:0">`, inline by construction — no floating-launcher mode. The one popup in this feature is Bot Framework Web Chat's own Microsoft sign-in button, triggered only by an explicit tap inside the conversation, used solely to complete sign-in (never for ordinary content), and required because `login.microsoftonline.com`'s real sign-in endpoint sends `X-Frame-Options: DENY` (verified via `curl`, 2026-09-09) — inline authentication is not possible, not merely avoided. This app adds no `sandbox` attribute to the iframe, so it does not block that popup. |
| V | Unattended Multi-Day Reliability | Every timer/listener torn down; no unbounded growth | **PASS** — the embed is contained inside an iframe boundary (R3) so unmounting it (via tab switch or idle-reset) destroys its entire browsing context, including any of its own timers/listeners we cannot audit; our own idle-keepalive interval (R5) is cleaned up in its effect's return function like `useIdleReset` already does |
| VI | Zero Secrets in the Client Bundle | No credential in client code/config | **PASS — confirmed against the real snippet (2026-09-09).** The supplied URL carries an environment ID and bot ID (resource identifiers) but no token/secret. **However, see the T012 finding below: the agent itself currently refuses to talk to this caller ("You don't have access to talk to this bot, contact the owner") — an authorization problem, not a secrets problem, and not fixable from this codebase.** |
| VII | Accessibility Baseline | WCAG AA, keyboard reachable, screen-reader labelled | **PASS for chrome we own** (button has `aria-label`, keyboard-focusable, meets contrast tokens); **known limitation** — the embedded widget's internal accessibility is outside this codebase's control and cannot be guaranteed until the real embed is available for audit |
| VIII | Static-First Delivery | Serve statically unless server-side state/computation/credentials are genuinely required | **PASS (justified exception)** — a live conversational agent inherently requires server-side computation (Copilot Studio's backend), which is precisely the case Principle VIII carves out; the kiosk's own bundle remains fully static, only the agent's runtime script/iframe is loaded dynamically, and only after the visitor opts in via the Start button |
| IX | Modular Feature Isolation | Removable without touching other features | **PASS** — new `src/tabs/voice-assistant/` folder plus one line in `registry.ts` (the exact extension point spec 001 designed for); no other tab or shell file is modified |

**Result: 9/9 PASS on this codebase's own responsibilities**, IV now passing under the documented v1.1.0 exception rather than unconditionally. **One finding remains an operational blocker outside this codebase, not a Constitution gate:**

### T012 finding, retested 2026-09-09 after the agent was published with Microsoft authentication: still denied, no sign-in card reached

Re-ran the same real-browser (Playwright/Chromium) check against the dev build after the user published the agent with Microsoft authentication enabled. Result: **identical** to the original T012 finding — the iframe loads, a Direct Line conversation opens, and the bot immediately replies **"You don't have access to talk to this bot, contact the owner."** No sign-in card, no OAuth prompt, no popup — the conversation is rejected before authentication is ever offered.

This confirms the original T012 hypothesis: the failure is at the **channel/environment access layer** (this URL is almost certainly the maker/test canvas share link, which gates on Power Platform environment membership), a check that happens *before* the bot's own "require Microsoft sign-in" setting ever gets a chance to run. Publishing the agent with Microsoft authentication does not by itself fix this — the caller is being turned away earlier in the pipeline. **The sign-in/popup architecture in this plan is still the correct design and is fully implemented; it simply hasn't been exercised end-to-end yet because this specific URL never reaches the point where a sign-in card would appear.** See `research.md`'s R3/T012 entries for the remediation paths (most likely: publish via Copilot Studio's "Custom website" channel instead of this maker-canvas link) — resolving that is the one remaining step to see the actual Microsoft sign-in popup fire.

**Post-Phase-1 re-check**: re-evaluated after Phase 1 design (data-model.md, contracts/), again after implementation against the real embed, and again after this sign-in amendment. No new dependency or persisted state was introduced; the only Constitution-relevant change is the documented, guarded popup exception under IV.

## Project Structure

### Documentation (this feature)

```text
specs/003-voice-info-agent/
├── plan.md                          # This file (/speckit-plan command output)
├── spec.md                          # Feature specification (/speckit-specify)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/                       # Phase 1 output (/speckit-plan command)
│   ├── agent-embed-contract.md      # What the (pending) Copilot Studio HTML must satisfy to drop in
│   └── idle-keepalive-contract.md   # The focus-heuristic hook's contract and guarantees
├── checklists/
│   └── requirements.md              # Spec quality checklist (/speckit-specify)
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── tabs/
│   ├── registry.ts                          # +1 line: register voice-assistant
│   └── voice-assistant/
│       ├── index.tsx                        # Default export: VoiceAssistant tab component
│       ├── meta.ts                          # id, EN/HU label, Mic icon, accent
│       ├── strings.ts                       # Tab-owned EN/HU copy (button, prompts, fallback, sign-in hint text -- FR-019/FR-023)
│       ├── examplePrompts.ts                # Static 3-domain example question list (FR-016)
│       ├── AgentPanel.tsx                   # Idle (button + prompts) <-> Active (embed) state machine
│       ├── AgentPanel.module.css            # Fixed-size container; no outer scroll (Constitution II)
│       ├── AgentEmbedContainer.tsx          # Iframe-boundary wrapper; mounts/destroys the embed
│       ├── AgentEmbedContainer.module.css   # Loading/error overlay + iframe sizing
│       ├── copilotStudioEmbed.ts            # COPILOT_STUDIO_EMBED_URL -- real embed, supplied 2026-09-09
│       ├── useIframeIdleKeepalive.ts        # R5: focus-in-iframe keeps the idle countdown alive
│       ├── useIframeIdleKeepalive.test.ts
│       ├── AgentPanel.test.tsx              # Idle state, button a11y/touch target, i18n, unmount clears state
│       └── VoiceAssistant.layout.browser.test.tsx  # Extends the existing no-scroll layout check to this tab
```

**Structure Decision**: Same single static frontend project as spec 001 — this feature adds exactly one new tab folder plus a one-line registry edit, per the extension point spec 001's `TABS` registry and `TabModule` contract were explicitly designed for (`specs/001-lobby-kiosk-shell/contracts/tab-module.md`). No backend package is introduced; the Copilot Studio agent's backend is Microsoft-hosted and reached directly from the browser via the embed, not proxied through infrastructure this repository owns (pending the Constitution VI re-check above). Tests stay colocated with the module they cover, matching the existing repository convention (Constitution IX).

**External input received (2026-09-09)**: the user supplied the real Copilot Studio embed HTML during `/speckit-implement`, before implementation started, so `AgentEmbedContainer.tsx` was built directly against `copilotStudioEmbed.ts`'s real URL rather than a stub. See plan.md's "T012 finding" above and `research.md`'s R3/R4/T012 entries for what was verified and the one open access-configuration blocker.

**Incidental fix discovered during implementation**: `src/components/TabNav/TabNav.module.css` hardcoded `grid-template-columns: repeat(4, 1fr)`, so adding this 5th tab made the nav wrap onto a second row (caught by the existing `App.layout.browser.test.tsx` touch-target-gap assertion). Changed `.tablist` to `display: flex` and `.tab` to `flex: 1 1 0` so the nav row is tab-count-agnostic going forward, consistent with the registry's "adding a tab is one folder + one line" design intent from spec 001.

**Sign-in amendment (2026-09-09)**: no new component files were needed for the sign-in flow itself — Bot Framework Web Chat (inside the iframe) already renders its own sign-in card and owns the popup call. The change is confined to: (1) `strings.ts` gaining a `signInHint` EN/HU string pair, (2) `AgentPanel.tsx`'s active view rendering that hint alongside the embed, and (3) `AgentEmbedContainer.tsx` gaining an explicit code comment recording that no `sandbox` attribute is used, precisely so the embed's internal `window.open()` call is never blocked. `contracts/agent-embed-contract.md` was updated with this as an explicit guarantee. Constitution v1.1.0's exception is what makes this permissible; see the Constitution Check above.

## Complexity Tracking

No Constitution Check violations — table omitted. (Two conditional/pending-verification items are tracked above, not violations.)
