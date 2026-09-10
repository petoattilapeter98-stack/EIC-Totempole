# Phase 1 Data Model: Voice Information Assistant

**Updated 2026-09-10**: this codebase now owns more local state than the 2026-09-09 iframe-embed design did — it drives speech recognition directly and holds a live Direct Line connection, rather than delegating both to an opaque embedded widget. The entities below reflect the current (Direct Line + Chrome STT) design; see git history for the superseded iframe-era version of this file.

## Note on spec entities vs. this codebase

spec.md's Key Entities section (Voice Query, Assistant Response, Knowledge Domain, Conversation Session, Employee Profile) describes the *conceptual* shape of the assistant's behavior. Domain routing, answer generation, and the approved employee dataset are still realized entirely **inside** the Copilot Studio agent, which this codebase still treats as an opaque third party for *content* purposes — none of those entities' actual data (what the agent knows, how it routes) is stored or modeled here. What changed 2026-09-10: this codebase now owns the **transport** to that agent (Direct Line) and the **recognition** of what the visitor said (Chrome's SpeechRecognition), which it did not before — see DirectLineConversation and TranscriptEntry below.

## Local Entities

### AgentPanelState

The tab's own view-state machine — everything this codebase needs to know about the assistant tab.

| Field | Type | Notes |
|---|---|---|
| `status` | `'idle' \| 'active'` | `idle`: example prompts + Start button shown, embed not mounted. `active`: embed mounted, Start button replaced by an "End" control. |

**Transitions**:

- `idle → active`: visitor taps the Start button (FR-002, FR-004). **Unchanged in shape since 2026-09-09**, but `active` now mounts `VoiceConversation` (Direct Line + continuous speech recognition) instead of an iframe embed.
- `active → idle`: visitor taps End (FR-008), OR the component unmounts because the visitor switched tabs, OR the idle auto-reset fires (FR-012) and returns the shell to Board Agenda, unmounting this tab entirely.
- On re-entering the tab after any `active → idle` transition via unmount, the component remounts fresh at `idle` — there is no persisted "last state," which is what gives FR-012's clearing guarantee for free (research.md R6).

No transition is stored outside React component state; nothing here is written to `localStorage`, a cookie, or any backend, consistent with spec 001's "Storage: N/A" precedent.

### DirectLineConversation (2026-09-10, new — replaces the iframe embed's opaque internal state)

Held in a ref inside `VoiceConversation` (not React state — nothing here needs to trigger a re-render on its own), scoped one-to-one with a single `AgentPanelState.status === 'active'` mount.

| Field | Type | Notes |
|---|---|---|
| `conversationId` | `string` | From Direct Line's `POST /conversations` response (directLineClient.ts). |
| `token` | `string` | Short-lived Direct Line token, obtained via Copilot Studio's public, unauthenticated provisioning endpoint (research.md R13) — there is no secret anywhere in this flow to protect (Constitution VI). |
| `streamUrl` | `string` | WebSocket URL for receiving the bot's activities in real time. |

**Lifecycle**: created by `startDirectLineConversation()` when the panel becomes active; the WebSocket it implies is closed and the ref cleared on unmount (`VoiceConversation`'s effect cleanup) — never re-created without first tearing down the prior one (Constitution V). Not persisted anywhere; a fresh conversation is started every time the panel goes idle → active again, consistent with FR-012's "no visitor's conversation remains visible to the next visitor."

### TranscriptEntry (2026-09-10, new)

The on-screen record of the current conversation (spec FR-005: text-only replies), held in `VoiceConversation`'s React state.

| Field | Type | Notes |
|---|---|---|
| `id` | `number` | Monotonically increasing, assigned locally — not a Direct Line activity ID. |
| `speaker` | `'visitor' \| 'assistant'` | Which side produced this turn. |
| `text` | `string` | The visitor's recognized utterance, or the bot's reply text. |

**Bounded growth (Constitution V)**: capped at the 12 most recent entries — older entries are dropped, not accumulated indefinitely, since a kiosk conversation could otherwise run for the panel's entire active lifetime with no natural upper bound. Cleared to `[]` on every fresh connection attempt (mount or retry) and discarded entirely on unmount, same as `AgentPanelState` above.

### ExamplePrompt

Static, localized content satisfying FR-016 (discoverability). Authored data, not runtime state.

| Field | Type | Notes |
|---|---|---|
| `domain` | `'innovation-centre' \| 'company' \| 'employees'` | Matches spec.md's three Knowledge Domains, for authoring traceability only — this codebase does not enforce or route on this value; it only labels which example belongs to which domain so FR-016/SC-007 ("at least one example per domain") is visibly satisfied. |
| `text` | `LocalizedText` (`{ en: string; hu: string }`) | The example question shown to the visitor, e.g. "What programs does the Innovation Centre run?" |

At least one `ExamplePrompt` per domain MUST exist (three minimum), per FR-016 and SC-007.

### Sign-In Session — REMOVED (2026-09-10)

**No longer applicable.** The 2026-09-09 Sign-In Session entity existed because the embedded page's authentication state was opaque and unobservable. As of 2026-09-10 there is no sign-in of any kind — the agent is deployed for unauthenticated access (research.md's "Require secured access" correction) — so there is nothing for this entity to describe. Removed rather than marked "not modeled," since unlike before, there is no longer an external thing it would even refer to.

### DirectLineSecret — does not exist (2026-09-10, corrected)

An earlier draft of this file modeled a server-side `DirectLineSecret` entity held in AWS Secrets Manager by a Lambda proxy. That infrastructure was never deployed and has been removed: the bot's Direct Line channel is reached via a public, unauthenticated token endpoint (research.md R13), so there is no secret anywhere in this feature — client-side or server-side — to model. See `direct-line-client-contract.md` guarantee 1.

## Relationships

```text
AgentPanelState (1) ──renders, when idle───> ExamplePrompt (3+, one per domain)
AgentPanelState (1) ──renders, when active─> VoiceConversation
VoiceConversation    ──holds───────────────> DirectLineConversation (1, ref)
VoiceConversation    ──holds───────────────> TranscriptEntry (0..12, state)
VoiceConversation    ──drives───────────────> useSpeechRecognition (active while status === 'active')
```

No entity here has a relationship to spec 001's `KioskState` beyond reading `locale` (for `ExamplePrompt`/button text, and as the speech-recognition language tag) and calling `reset()` (spec 001's idle-countdown keepalive — called directly on every recognized utterance and every bot reply, since there is no iframe boundary left to bridge, unlike the 2026-09-09 design's `useIframeIdleKeepalive`) — both already exposed by `useKiosk()`. This feature does not add any field to `KioskState` itself; `resetInteractionState` (spec 001) is unchanged and continues to only reset `activeTab`, which is what tears this feature's local state down via unmount.
