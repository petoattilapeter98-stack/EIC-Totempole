# Contract: Agent Embed Container

**Component**: `src/tabs/voice-assistant/AgentEmbedContainer.tsx`

**Purpose**: Defines what the Copilot Studio-provided embed must satisfy to be used by this feature, and what `AgentEmbedContainer` guarantees to the rest of the tab. Originally written before the real HTML was supplied; updated 2026-09-09 to match the as-shipped component (props corrected) and to add the sign-in popup guarantee introduced by that day's authentication amendment.

## Props (as shipped)

```ts
interface AgentEmbedContainerProps {
  readonly locale: Locale;
  /** Exposed so the parent can bridge idle-reset across the iframe boundary (useIframeIdleKeepalive). */
  readonly iframeRef: RefObject<HTMLIFrameElement | null>;
}
```

`onEnd` is not a prop of this component: ending a session is handled entirely by `AgentPanel` unmounting `AgentEmbedContainer` (transitioning `status` back to `'idle'`), which is what actually tears the embed down (guarantee 2) — there is nothing for the container itself to be told to do differently on end. `onReady` was speculative at planning time and was not wired: nothing in this codebase currently needs to react to the embed becoming ready, since (per research.md R10/R11) this app cannot observe the embed's internal state regardless.

## Guarantees `AgentEmbedContainer` makes to its caller (`AgentPanel`)

1. **Fixed footprint**: renders within a container of a size supplied by `AgentPanel`'s layout (CSS Grid/flex item) and never grows beyond it — no internal content of the embed may force the outer kiosk page to scroll (Constitution II). Any scrolling the embed needs for its own transcript happens inside its own fixed-size box.
2. **Full teardown on unmount**: when `AgentEmbedContainer` unmounts (visitor ends the session, switches tabs, or the idle auto-reset fires), every resource associated with the embed — its iframe, any listeners, any timers — is destroyed. No global `window`/`document` state may persist past unmount (Constitution V, IX).
3. **No secrets pass through props or are hard-coded in this component**: verified against the real embed URL (research.md R4) — it carries a resource identifier, not a credential (Constitution VI).
4. **Inline rendering only, with one narrow exception**: the embed is presented as a normal block-level element inside the tab's content region — MUST NOT be configured, styled, or scripted to appear as a floating launcher bubble, corner widget, or modal overlay (Constitution IV). The sole exception is the Microsoft sign-in popup (guarantee 6, below), which is not this app's UI at all.
5. **Failure is visible and recoverable**: if the embed fails to load (network error, script error, timeout — 10s), the container shows a fallback message and lets the visitor retry, without requiring a kiosk-wide reload (spec FR-010).
6. **Does not block the embed's own sign-in popup**: the `<iframe>` this component renders carries **no `sandbox` attribute**. Bot Framework Web Chat (running inside the iframe) opens Microsoft's sign-in page via its own `window.open()` call when the bot requires authentication (research.md R10) — an unsandboxed iframe permits this by default. If a `sandbox` attribute is ever added to this iframe for another reason, it MUST include `allow-popups allow-popups-to-escape-sandbox`, or sign-in becomes impossible (spec FR-019–FR-023, Constitution IV's identity sign-in exception, v1.1.0). This app never calls `window.open()` itself and has no code path that could — the popup, if and when it happens, originates entirely inside the iframe's own script.

## What the real embed provides, and what `AgentEmbedContainer` does about it

| Aspect | What was found (2026-09-09) | What this container does |
|---|---|---|
| Presentation | Plain `<iframe style="width:100%;height:100%;border:0">` — inline by construction | Used directly, sized by CSS (guarantee 4) |
| Client secret | None in the URL (environment ID + bot ID only) | Used as-is (guarantee 3) |
| Ready/loaded signal | Native iframe `onLoad` only; no `postMessage` observed | Wired to `onLoad`, paired with a 10s timeout fallback (guarantee 5) |
| Activity/focus signal for idle-keepalive | None observed from the embed | Uses the focus-heuristic fallback unchanged (research.md R5, `idle-keepalive-contract.md`) |
| Locale/language parameter | Not supported by this URL | Documented as an unresolved limitation (research.md R7); does not block the rest of the feature |
| Sign-in / authentication | Bot Framework Web Chat's built-in OAuthCard, opening `window.open()` from inside the iframe when the bot requires it | This container does nothing to trigger or intercept it — only avoids blocking it (guarantee 6). See `research.md` R10/R11: as of 2026-09-09 this specific URL is denied *before* reaching that sign-in step, so this guarantee is implemented but not yet exercised against a real sign-in prompt. |
