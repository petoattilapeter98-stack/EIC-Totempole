# Contract: `useSpeechRecognition`

**Hook**: `src/tabs/voice-assistant/useSpeechRecognition.ts`

**Purpose**: Wraps Chrome's built-in Web Speech API (`SpeechRecognition`) to provide continuous, hands-free listening (spec FR-002, FR-004, User Story 1) — the visitor speaks whenever they want, with no push-to-talk or per-question control. Replaces `idle-keepalive-contract.md` (2026-09-09, superseded 2026-09-10) — the cross-origin iframe-focus keepalive problem that hook solved no longer exists (there is no iframe), so `VoiceConversation` re-arms the idle countdown directly via the `reset` callback it already receives, on every recognized utterance and every bot reply.

## Signature

```ts
interface UseSpeechRecognitionOptions {
  readonly lang: string; // BCP-47, e.g. 'en-GB' / 'hu-HU' (from i18n/locales.ts LOCALE_TAGS)
  readonly active: boolean; // recognition only runs while true
  readonly onFinalTranscript: (text: string) => void;
}

interface UseSpeechRecognitionResult {
  readonly interimTranscript: string;
  readonly listening: boolean;
  readonly supported: boolean;
  readonly error: 'not-supported' | 'no-permission' | 'unavailable' | null;
}

function useSpeechRecognition(options: UseSpeechRecognitionOptions): UseSpeechRecognitionResult;
```

## Guarantees

1. **No microphone access until `active` is true**: no `SpeechRecognition` instance is created, and no permission prompt is triggered, while `active` is false — mirrors the 2026-09-09 design's "no mic access until Start is tapped" privacy guarantee (research.md R2), now enforced by this hook directly rather than by deferring to an embed's own mount.
2. **Effectively continuous listening**: Chrome's `continuous: true` mode still self-terminates after a pause in speech (fires `onend`); this hook restarts recognition automatically whenever `onend` fires while `active` remains true, so the visitor never needs to re-trigger listening mid-conversation. Restart does **not** happen after a deliberate teardown (`active` became false, or the component unmounted).
3. **Exactly one recognizer at a time, always released on cleanup**: `abort()` is called on every cleanup path (active → false, unmount, or a `lang` change re-running the effect), and all four handlers (`onstart`/`onresult`/`onerror`/`onend`) are nulled out before `abort()`, so an in-flight event from an already-torn-down recognizer cannot fire a stale callback (Constitution V).
4. **`onFinalTranscript` fires once per final result, never for interim ones**: results are walked from `event.resultIndex`; a result with `isFinal: true` invokes the callback with the trimmed transcript text, while non-final results only update `interimTranscript` (for live on-screen feedback) and never invoke the callback.
5. **Errors are classified, not just surfaced as a single generic failure**: `'not-allowed'`/`'service-not-allowed'` map to `'no-permission'` (spec Edge Case: denied mic permission); `'no-speech'` and `'aborted'` are silently ignored (expected, not errors — continuous mode restarts naturally); anything else maps to `'unavailable'`. `supported: false` (no `SpeechRecognition` constructor at all) always reports `error: 'not-supported'`, taking priority over any per-instance error state.
6. **`onFinalTranscript`'s identity is not a dependency trap**: read via a ref internally (same pattern as `useIdleReset`'s `onExpireRef`), so a parent re-render passing a structurally-new-but-equivalent callback does not tear down and recreate the recognizer.

## Explicitly out of scope

- No wake-word detection — "active" listening begins the instant the panel becomes active (Start tapped), not on a spoken trigger phrase (spec Clarifications, Session 2026-09-10, Q4).
- No language auto-detection — `lang` is driven entirely by the kiosk's existing EN/HU toggle (`i18n/locales.ts`), not inferred from speech.
- No support for browsers without a `SpeechRecognition`/`webkitSpeechRecognition` constructor beyond reporting `'not-supported'` — no polyfill, no server-side STT fallback (research.md R14: Chrome specifically, not general Chromium, is the supported target for this feature).
