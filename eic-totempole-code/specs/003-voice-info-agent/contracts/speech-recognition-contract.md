# Contract: `useSpeechRecognition`

**Hook**: `src/tabs/voice-assistant/useSpeechRecognition.ts`

**Purpose**: Wraps Chrome's built-in Web Speech API (`SpeechRecognition`) to capture a visitor's speech (spec FR-002, FR-004, User Story 1). Replaces `idle-keepalive-contract.md` (2026-09-09, superseded 2026-09-10) — the cross-origin iframe-focus keepalive problem that hook solved no longer exists (there is no iframe), so `VoiceConversation` re-arms the idle countdown directly via the `reset`/`signalActivity` callback it already receives, on every recognized utterance and every bot reply.

**Updated 2026-09-23**: this hook itself is unaware of push-to-talk vs. hands-free — it only reacts to its `active` option, whatever drives it. From 2026-09-10 through 2026-09-22 the caller passed `active: status === 'ready'` (hands-free, listening for the whole session). As of 2026-09-23 the caller passes `active: status === 'ready' && talking`, where `talking` follows a press-and-hold talk button (spec FR-004, reverted to push-to-talk; research.md R17) — this hook's own guarantees below are unchanged by that switch except guarantee 3, which is corrected.

**Updated 2026-09-24**: `onFinalTranscript` is now called once per activation (one press), not once per final result. Guarantee 4 is rewritten, guarantee 3 amended, and guarantee 7 added (spec FR-027, research.md R18).

## Signature

```ts
interface UseSpeechRecognitionOptions {
  readonly lang: string; // BCP-47, e.g. 'en-GB' / 'hu-HU' (from i18n/locales.ts LOCALE_TAGS)
  readonly active: boolean; // recognition only runs while true
  readonly onFinalTranscript: (text: string) => void; // at most once per activation (2026-09-24)
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
2. **Listening continues for as long as `active` stays true, even across a mid-utterance pause**: Chrome's `continuous: true` mode still self-terminates after a pause in speech (fires `onend`); this hook restarts recognition automatically whenever `onend` fires while `active` remains true, so a visitor pausing mid-sentence while still holding the talk button (2026-09-23: `active` follows the press, not the whole session — research.md R17) doesn't get cut off. Restart does **not** happen after a deliberate teardown (`active` became false — e.g. the talk button was released — or the component unmounted).
3. **CORRECTED 2026-09-23 — cleanup uses `stop()`, not `abort()`, so a trailing utterance isn't silently dropped.** This guarantee originally said `abort()` was called on every cleanup path. Under hands-free listening that teardown was rare (Start/End, unmount); under push-to-talk it runs on *every single button release*, and `abort()` discards whatever audio was already captured without producing a final result for it — silently dropping the visitor's last word or two right as they let go. Cleanup now calls `recognition.stop()`, which finishes processing already-captured audio and still fires a final `result` for it. `onstart`/`onerror`/`onend` are nulled out before `stop()` (so a restart or a stray status update can't fire from an already-torn-down instance), but **`onresult` is deliberately left attached** through cleanup so that trailing final result still reaches `onFinalTranscript` — the interim-transcript display is separately suppressed once cleanup has run, so a late, non-final result from the outgoing instance can't flash stale text over a newly started press (research.md R17). **Amended 2026-09-24**: `onend` also stays attached through cleanup. After a deliberate teardown it no longer restarts; it flushes the activation's buffered text (guarantee 4).
4. **REWRITTEN 2026-09-24: `onFinalTranscript` fires at most once per activation, with everything recognized during it.** Results are walked from `event.resultIndex`; every final segment is buffered for the current activation, never delivered immediately. After `active` goes false, the stopped instance's `onend` joins the buffered segments (space-separated, whitespace-collapsed, trimmed) and invokes the callback once, or not at all if the result is empty. A mid-activation `onend` (Chrome pausing) restarts recognition and sends nothing. While active, `interimTranscript` shows the buffered finals plus the current non-final text, for live on-screen feedback. *(Was: "fires once per final result", which sent one message per pause; see research.md R18.)*
5. **Errors are classified, not just surfaced as a single generic failure**: `'not-allowed'`/`'service-not-allowed'` map to `'no-permission'` (spec Edge Case: denied mic permission); `'no-speech'` and `'aborted'` are silently ignored (expected, not errors — continuous mode restarts naturally); anything else maps to `'unavailable'`. `supported: false` (no `SpeechRecognition` constructor at all) always reports `error: 'not-supported'`, taking priority over any per-instance error state.
6. **`onFinalTranscript`'s identity is not a dependency trap**: read via a ref internally (same pattern as `useIdleReset`'s `onExpireRef`), so a parent re-render passing a structurally-new-but-equivalent callback does not tear down and recreate the recognizer.
7. **(new 2026-09-24) A flush is never lost and never doubled**: cleanup arms a 2 s fallback timer that flushes if the stopped instance never fires `onend`. The flush is idempotent and clears that timer, so the timer never outlives the flush (Constitution V), and a late `onend` after a fallback flush sends nothing.

## Explicitly out of scope

- No wake-word detection — "active" listening begins the instant the caller's `active` option becomes true (2026-09-23: the talk button is pressed; 2026-09-10 through 2026-09-22: the panel became active), not on a spoken trigger phrase (spec Clarifications, Session 2026-09-23 Q6, superseding Session 2026-09-10 Q4).
- No language auto-detection — `lang` is driven entirely by the kiosk's existing EN/HU toggle (`i18n/locales.ts`), not inferred from speech.
- No support for browsers without a `SpeechRecognition`/`webkitSpeechRecognition` constructor beyond reporting `'not-supported'` — no polyfill, no server-side STT fallback (research.md R14: Chrome specifically, not general Chromium, is the supported target for this feature).
