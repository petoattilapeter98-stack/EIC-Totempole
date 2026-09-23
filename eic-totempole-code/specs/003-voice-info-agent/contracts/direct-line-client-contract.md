# Contract: Direct Line Client

**Module**: `src/tabs/voice-assistant/directLineClient.ts`, `src/tabs/voice-assistant/VoiceConversation.tsx`

**Purpose**: Defines what this app's own Direct Line integration guarantees, replacing `agent-embed-contract.md` (2026-09-09, superseded 2026-09-10) now that the hosted Copilot Studio iframe is no longer embedded at all (research.md R12).

## Why this exists instead of an embed contract

The 2026-09-09 design embedded Microsoft's own hosted webchat page and could only make guarantees about *containing* it (fixed footprint, no secret in the URL, doesn't block its popup). The 2026-09-10 design owns the actual Bot Framework Direct Line protocol client, so its guarantees are about correct, secure use of that protocol instead.

## Functions (as shipped)

```ts
function startDirectLineConversation(provisionTokenUrl: string): Promise<DirectLineConversation>;
function postDirectLineMessage(conversation: DirectLineConversation, text: string, locale: string): Promise<void>;
function subscribeToDirectLineActivities(
  streamUrl: string,
  onActivity: (activity: DirectLineActivity) => void,
  onError: () => void,
): () => void; // unsubscribe
```

## Guarantees

1. **No secret exists anywhere in this flow — there is nothing to protect, not something hidden server-side.** `startDirectLineConversation` calls `agentConfig.DIRECT_LINE_PROVISION_TOKEN_URL`, a public, unauthenticated, CORS-open (`Access-Control-Allow-Origin: *`, verified directly) endpoint that hands out a Direct Line token to any caller — the exact endpoint Copilot Studio's own hosted demo page calls internally (research.md R12/R13). This satisfies Constitution VI trivially rather than via a proxy: this app's bundle, this app's requests, and this endpoint's response all contain zero long-lived credentials. **An earlier draft of this feature built a server-side Lambda token-exchange proxy on the (incorrect) assumption that a secret was required; that infrastructure was never applied and has been removed** — see research.md's correction.
2. **CORRECTED 2026-09-23 — Outgoing-echo filtering is not effectively done by `from.id` matching.** This guarantee originally claimed that because every posted message activity carries `from: { id: KIOSK_VISITOR_ID }` (a fixed, non-identifying constant — never a real visitor identifier), `subscribeToDirectLineActivities` could reliably distinguish the bot's own replies from echoes of this app's own outgoing messages by comparing `from.id`. **This was never verified against the live agent and is false**: a live probe (research.md R16) showed Direct Line's echo of a posted message carries a *server-assigned session GUID* as `from.id`, never the client-supplied value. `subscribeToDirectLineActivities` still contains the `from.id !== KIOSK_VISITOR_ID` check (kept as a harmless no-op — it would still work if Direct Line ever did honor the client-supplied id), but in practice it lets nearly every activity through, including echoes, since the condition is essentially always true. The actual filtering happens one layer up, in `VoiceConversation.tsx`: each outgoing message's exact text is queued (`pendingSentTexts`, capped at 5) when posted; the first incoming activity whose text matches is recognized as the echo and dropped, and its `from.id` is remembered (`knownSelfIds`) so later echoes from that same id are dropped without needing another text match.
3. **The WebSocket subscription is a single, explicitly torn-down resource**: `subscribeToDirectLineActivities` returns an unsubscribe function that closes the socket and clears its handlers; `VoiceConversation`'s effect cleanup calls it on every unmount and every reconnect (Constitution V — no leaked connection, no duplicate socket on retry).
4. **Failure is visible and recoverable**: a token-endpoint failure, a Direct Line REST error, or a WebSocket error all resolve to the same `status === 'error'` UI state with a Retry control (spec FR-023, mirrors FR-010) — never a silently stuck "connecting" state.
5. **Empty/keepalive WebSocket frames are silently ignored**, not treated as malformed input — Direct Line's protocol sends periodic empty-string frames as a connection keepalive, independent of any activity.
6. **A failed outgoing message does not lose the conversation**: if `postDirectLineMessage` rejects (e.g. a dropped request), `VoiceConversation` shows a brief, dismissable-by-nature (auto-clears on the next successful turn) `sendError` banner rather than tearing down the whole connection or losing prior transcript entries.

## Explicitly out of scope

- Rich activity types (Adaptive Cards, suggested actions, attachments) are not rendered — only `type === 'message'` activities with a `text` field are shown. A bot reply that is card-only with no text fallback renders nothing for that turn; this is a known, accepted limitation of the current text-transcript UI, not a defect (research.md).
- No retry/backoff on the WebSocket beyond what the visitor triggers manually via the Retry button — this mirrors the 2026-09-09 design's own scope boundary (agent-embed-contract.md guarantee 5) applied to the new transport.
