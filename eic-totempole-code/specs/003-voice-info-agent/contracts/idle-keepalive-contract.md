# Contract: `useIframeIdleKeepalive`

**Hook**: `src/tabs/voice-assistant/useIframeIdleKeepalive.ts`

**Purpose**: Bridges the shell's idle auto-reset countdown (`useIdleReset`, spec 001) across the agent iframe's boundary, so a conversation in progress is not interrupted by an unrelated reset (spec FR-011), without requiring any cooperation from the (opaque, possibly cross-origin) embedded agent.

## Signature

```ts
interface UseIframeIdleKeepaliveOptions {
  /** Ref to the agent iframe/container element currently mounted, or null when inactive. */
  readonly targetRef: RefObject<HTMLElement | null>;
  /** The shell's existing reset function from useIdleReset (spec 001). */
  readonly reset: () => void;
  /** How often to call reset() while focus remains inside the target. Default 5000ms — well under IDLE_TIMEOUT_SECONDS (60s, spec 001). */
  readonly keepaliveIntervalMs?: number;
}

function useIframeIdleKeepalive(options: UseIframeIdleKeepaliveOptions): void;
```

## Guarantees

1. **No effect when inactive**: while `targetRef.current` is `null` (the panel is idle, no embed mounted), this hook does nothing — it does not start any interval or attach any listener. The shell's normal `useIdleReset` document-level listeners (spec 001) govern the countdown exactly as they do on every other tab.
2. **Keepalive only while focus is inside the target**: starts calling `reset()` on `keepaliveIntervalMs` only when `document.activeElement` is (or is contained within) the target element — detected via document-level `focusin`/`focusout`, the same listener style `useIdleReset` already uses for `pointerdown`/`keydown`. This relies on Chromium's behavior of firing a normal bubbling `focusin` on the iframe element itself when focus moves into its content, which holds for the kiosk's single target browser (Constitution I); older/other engines have historically needed a `window.blur` + `document.activeElement` check instead, which is not required here. Stops within one tick of focus leaving the target, verified by lack of further `reset()` calls in the following interval tick.
3. **Cleans up on every unmount and every options change**: exactly one interval and one set of listeners exist at a time; changing `targetRef`'s current value (e.g., a fresh embed mount) does not leak a prior interval. Mirrors `useIdleReset`'s own cleanup discipline (spec 001, Constitution V).
4. **`reset` identity is not a dependency trap**: the latest `reset` is read via a ref internally (same pattern as `useIdleReset`'s `onExpireRef`), so a parent re-render passing a structurally-new-but-equivalent `reset` callback does not tear down and recreate the interval.
5. **Never calls `reset()` when focus is outside the target**, even if the countdown is close to expiring — this hook only ever *delays* the existing countdown by re-triggering it, it never suppresses or replaces `useIdleReset`'s own expiry logic.

## Explicitly out of scope

- Does not attempt cross-origin introspection of the iframe's contents (impossible for a cross-origin embed, and not attempted even for a same-origin `srcdoc` iframe, to keep behavior uniform regardless of embed type).
- Does not listen for `postMessage` — if the real embed (once supplied) turns out to emit usable activity events, prefer wiring those directly per `agent-embed-contract.md`'s activity-signal row; this hook remains as the fallback path for an embed that emits nothing.
