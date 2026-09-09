# Phase 0 Research: Voice Information Assistant

All items below were resolved without a [NEEDS CLARIFICATION] marker reaching plan.md; each documents the decision, why, and what was rejected. R3 and R4 were originally flagged **re-verify when the real embed HTML is supplied** — the real snippet arrived during `/speckit-implement` and both were verified against it directly (T012); see those sections for the actual result.

## R1: Where does the assistant live in the UI?

- **Decision**: A fifth entry in the existing `TABS` registry (`src/tabs/voice-assistant/`), built to the same `TabModule` contract as the other four tabs.
- **Rationale**: The user's planning input explicitly asked for "the same UI as the rest of the application." Spec 001 already built exactly this extension point — one folder plus one registry line — and the nav bar / content region already render generically from that registry with no per-tab special-casing.
- **Alternatives considered**: A persistent floating action button outside the tab row (e.g., a corner "Ask" bubble). Rejected: it would look and behave differently from every other kiosk affordance, and a fixed-position floating control reads as exactly the kind of overlay Constitution Principle IV (no popups/overlays) is written to prevent.

## R2: What does the button start, and what happens after?

- **Decision**: The tab's content region has two states — **idle** (heading, three example prompts spanning the three knowledge domains, and a single "Start Assistant" button) and **active** (the mounted Copilot Studio embed, plus a way to end and return to idle). The button is the sole trigger that mounts the embed.
- **Rationale**: The user's planning input says "just integrate an extra button to start the agent" — the button's job is narrowly to start the agent experience, not to reimplement push-to-talk once the embed (which almost certainly has its own listening/input affordances) is live. Deferring the mount until tap also means no microphone permission prompt and no third-party network/script load happen for a visitor who is only glancing at the tab — important on a kiosk that spends most of its time unattended (Constitution V, VIII).
- **Alternatives considered**: Auto-mounting the embed as soon as the tab becomes active. Rejected: it would request microphone access and load a remote script on every idle-reset cycle that happens to land on this tab, and would keep a live third-party iframe running continuously rather than only when a visitor actually engages.

## R3: How is the third-party embed contained? — UPDATED (2026-09-09, T012 result)

- **Decision**: The supplied snippet is itself a plain `<iframe>` (not a script-based SDK), so it's used directly — `AgentEmbedContainer.tsx` renders it sized via CSS to sit inline inside the content region, exactly as planned. No `srcdoc`-wrapping layer was needed.
- **Rationale**: Constitution V requires every listener/timer to be torn down and never re-created without clearing the prior instance; Constitution IX requires the feature to be removable without reaching into shared state. An iframe boundary makes "stop the agent" structurally equal to "destroy the iframe" — the browser guarantees full cleanup of everything inside it, regardless of what that code does internally.
- **Alternatives considered**: Injecting the snippet directly into the tab's DOM/global scope. Rejected: a leaked interval or listener from unreviewed third-party code would violate the 72-hour unattended-reliability bar (spec SC-006) in a way we could not fix without a vendor change.
- **Inline-vs-popup verification: PASS.** The supplied markup (`<iframe style="width:100%;height:100%;border:0;">`) is inline by construction — there is no floating launcher/bubble mode to guard against here. Confirmed visually via a real Chromium/Playwright run against the dev build (see T012 finding below).

## T012 finding (2026-09-09): the agent is reachable, but access is denied by the bot itself

Ran the real embed end-to-end in a real Chromium browser (Playwright, not jsdom) against the dev server: opened the Voice Assistant tab, tapped Start, and let the iframe load against the actual `copilotstudio.microsoft.com/.../webchat` URL supplied by the user.

**What happened**: the iframe loaded successfully (HTTP 200, no sign-in/Entra redirect at all), the Bot Framework Web Chat UI inside it initialized, and it opened a Direct Line conversation over WebSocket to `unitedstates.directline.botframework.com`. The bot then replied with its own message:

> "You don't have access to talk to this bot, contact the owner."

This is **not** a browser-level auth failure (no login prompt was ever shown — Direct Line connected and a conversation was created) and **not** a client-secret problem (R4 is resolved clean). It's the Copilot Studio agent's own authorization check rejecting this specific caller identity — i.e., exactly the failure mode the user predicted ("the app won't have permission to talk to this bot").

**What this means for "supply Copilot rights to the app"**: this is a Copilot Studio / Power Platform *configuration* action, not something fixable from this repository's code — there is no client-side credential or header this app can add to satisfy an agent-level authorization check. Concretely, someone with maker/admin access to this Copilot Studio environment needs to do one of:

1. **Most likely fix**: this `copilotstudio.microsoft.com/environments/.../bots/.../webchat` URL is the *maker/test canvas* share link, which is a screening more than a public embed — it typically only authorizes environment members/testers. The intended production path for a public, unauthenticated kiosk is **Copilot Studio → agent → Channels → "Custom website"** (or equivalent public channel), which publishes a distinct, anonymous-access-configured embed. Re-check whether that publish flow produces a different URL/snippet and use that instead.
2. If this specific URL/channel is meant to be used as-is, open the agent's **Settings → Security → Authentication** and confirm it's set to allow anonymous/no-authentication access, then (re-)publish.
3. If the agent is intentionally kept authenticated, the kiosk's calling identity (there currently isn't one — no user is signed in) needs to be granted an allowed security role/seat in this Power Platform environment, which conflicts with the kiosk being an unattended, unauthenticated public device and is not recommended.

Path 1 is the most likely correct fix and should be tried first. This is now the single open blocker for User Story 1 being genuinely demonstrable end-to-end; everything else in this feature (tab, panel, button, layout, idle-keepalive, cleanup) works as designed against the real embed.

## R4: Client-side secrets — RESOLVED (2026-09-09, T012)

- **Finding**: The real snippet contains no client-held credential — it is a bare `copilotstudio.microsoft.com/environments/.../bots/.../webchat` iframe URL with no token or secret in the markup, so Constitution VI's "no secret in the client bundle" gate is satisfied as shipped. **This resolves the client-secret half of the original conditional pass; see R3 below for the separate, still-open access problem this same test surfaced.**
- Verified by loading the real embed in a real Chromium browser (Playwright) against the actual URL supplied by the user and inspecting the page/network traffic; see R3 for the full transcript and finding.

## R5: Keeping the idle countdown alive during a conversation

- **Decision (as implemented)**: `useIframeIdleKeepalive` listens for document-level `focusin`/`focusout` (the same listener style `useIdleReset` already uses for `pointerdown`/`keydown`) and, while `document.activeElement` is the agent iframe, calls the shell's existing `reset()` on a short interval; it stops within one tick of focus leaving the iframe.
- **Rationale**: Spec FR-011 requires active use of the voice section to count as interaction so a conversation isn't cut off by the unrelated auto-reset. `useIdleReset`'s document-level `pointerdown`/`keydown` listeners (spec 001) cannot see events *inside* a cross-origin iframe's own document. What *is* observable in the parent document is the focus transfer itself: Chromium (the kiosk's only target browser, Constitution I) fires a normal bubbling `focusin` on the iframe element when its content is focused, so a plain document-level listener suffices — no `window.blur`-based workaround (needed historically for cross-browser/Safari-era inconsistency) was required for this single-target-browser kiosk.
- **Alternatives considered**: Listening for `postMessage` activity events from the embed. The real embed (Bot Framework Web Chat over Direct Line) likely emits some events, but wiring to them would couple this hook to Web Chat's specific API; the focus heuristic works regardless of what's inside the iframe and was kept as the shipped implementation.

## R6: Clearing conversation state (FR-012)

- **Decision**: No explicit "clear conversation" call is implemented. Reuse `ContentRegion`'s existing `key={activeTab}` remount behavior (spec 001): switching away from the assistant tab — whether by the visitor picking another tab, ending the session, or the idle auto-reset firing — unmounts the tab's whole component tree, destroying the embed's iframe and everything inside it.
- **Rationale**: This is a strictly stronger guarantee than asking an unknown third-party widget for a "reset" API it may not expose, and it costs nothing new to build — it already exists for every other tab.
- **Alternatives considered**: Calling a widget-specific reset/clear method. Rejected as the baseline since we don't yet know if one exists; full unmount is a superset of what any such API would achieve.

## R7: Language sync between the kiosk toggle and the agent

- **Decision (documented limitation)**: The tab's own chrome — heading, example prompts, button label, fallback text — follows the kiosk's EN/HU toggle via a tab-owned `strings.ts`, exactly like Company Highlights and every other tab (Constitution IX). The embedded agent's own conversation language is controlled by Copilot Studio's own configuration and is **not** reactively switched by the kiosk's EN/HU toggle in this iteration.
- **Rationale**: Reactively reconfiguring a live embedded agent's language would require a specific API from the actual snippet, which isn't available yet. Building the rest of the feature language-correct now and revisiting this once the real embed's capabilities are known is preferable to blocking the whole feature on an unknown API.
- **Alternatives considered**: Remounting the embed on every locale change to force a fresh, correctly-localized session. Deferred rather than rejected outright — worth reconsidering once the real snippet is available, since it may be as simple as passing a locale parameter into the embed URL.

## R8: Static-first delivery vs. a runtime third-party script

- **Decision**: Treat the embed's remote script/iframe as a justified exception under Constitution VIII, not a violation.
- **Rationale**: Principle VIII itself reserves dynamic dependencies for "functionality that genuinely requires server-side state, computation, or credential handling" — a conversational agent answering open-ended questions is exactly that; it cannot be pre-rendered as a static asset. The kiosk's own bundle remains 100% static; only the opt-in, on-demand agent embed is loaded dynamically, and only after a visitor taps Start.
- **Alternatives considered**: None — there is no static substitute for a live conversational agent.

## R9: Building against a snippet that doesn't exist yet — OVERTAKEN BY EVENTS

- **Original decision (planning time)**: Implement `AgentEmbedContainer` against a placeholder stub satisfying `contracts/agent-embed-contract.md`, so the rest of the feature wasn't blocked on the pending HTML.
- **What actually happened**: the user supplied the real Copilot Studio HTML in the same `/speckit-implement` session, before any code was written, so `AgentEmbedContainer.tsx` was built directly against the real `COPILOT_STUDIO_EMBED_URL` (`src/tabs/voice-assistant/copilotStudioEmbed.ts`) from the start — no `.stub.ts` placeholder file exists in the shipped implementation. The container's loading/error/retry states (contract guarantee 5) still provide the same graceful-degradation behavior a stub would have exercised, now proven against the real endpoint (see T012 finding under R3).

## R10: Why sign-in has to be a popup (2026-09-09 amendment)

- **Finding, empirically verified**: `curl -D - https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=<real-id>&response_type=code&...` returns `X-Frame-Options: DENY`. `login.live.com/` returns `X-Frame-Options: deny` as well. Both are checked directly, not assumed from general knowledge, per Constitution v1.1.0's requirement that this exception be justified "by inspection, not assumed."
- **Decision**: sign-in MUST happen in a popup, because it structurally cannot happen inline — no CSS, container, or code choice on this app's side can make Microsoft's sign-in page render in an iframe.
- **Who owns the popup call**: this app does not write any sign-in UI or call `window.open()` itself. The embedded Copilot Studio agent runs on Bot Framework Web Chat, which has a built-in mechanism for bot-requested authentication: when a bot needs the caller to sign in, Web Chat renders a message with a "Sign in" button (an OAuthCard/SigninCard), and clicking it calls `window.open()` **from inside the iframe** to the real Microsoft sign-in URL. This is standard, well-documented Bot Framework Web Chat behavior, not something built for this feature.
- **What this app is actually responsible for**: (1) not blocking that `window.open()` call — achieved by never adding a `sandbox` attribute to the `<iframe>` (the default, unsandboxed state already permits popups from within it); (2) telling the visitor/operator, in this app's own chrome, that a Microsoft sign-in popup is expected behavior, since an unexplained popup on a public kiosk would otherwise look alarming or broken (spec FR-019/FR-023) — implemented as a persistent hint string (`signInHint`) shown alongside the embed whenever the panel is active, since this app has no way to detect the opaque, cross-origin iframe's actual auth state and therefore cannot show the hint conditionally only when actually needed.
- **Alternatives considered**: Building a custom pre-authentication gate using our own Entra app registration and MSAL.js, then somehow supplying an acquired token to the embed. Rejected: we are embedding *Microsoft's own hosted iframe page*, not a Direct Line connection this app constructs itself — there is no supported way to inject a pre-acquired token into someone else's hosted webchat page, and building a parallel auth system would duplicate what Bot Framework Web Chat already does, while adding a real Entra app registration, redirect-URI, and token-handling surface this feature does not otherwise need (and which would raise its own Constitution VI questions).

## R11: Retest after the agent was published with Microsoft authentication (2026-09-09) — still blocked, but earlier in the pipeline than expected

Re-ran the same Playwright/Chromium check from T012 (see R3) against the same URL, after the user published the Copilot Studio agent with Microsoft authentication enabled.

**Result: identical failure.** The iframe loads, Bot Framework Web Chat initializes, a Direct Line conversation opens (HTTP 201), and the bot immediately replies:

> "You don't have access to talk to this bot, contact the owner."

No sign-in card ever appeared; no request to `login.microsoftonline.com` was observed at all. This means the rejection happens **before** the bot's own "require Microsoft sign-in" setting is ever consulted — it's still the channel/environment-level access check from the original T012 finding (this URL being the maker/test canvas link), which evaluates first and short-circuits everything downstream, including the new authentication requirement.

**Implication**: the sign-in/popup architecture (R10, spec FR-019–FR-023) is correctly designed and fully implemented on this app's side, but has not yet been exercised against a real Microsoft sign-in prompt in this environment, because this specific URL never gets past the earlier channel-access check. Resolving the original T012 remediation (most likely: publish via Copilot Studio's "Custom website" channel rather than this maker-canvas link) remains the prerequisite for actually seeing — and validating — the sign-in popup fire.
