# Contract: Timer Hooks

**Feature**: `001-lobby-kiosk-shell` | **Location**: `src/hooks/`

Both hooks own a repeating timer. Constitution Principle V (unattended multi-day reliability) makes their cleanup behaviour a hard contract, not an implementation detail — these are the two modules most capable of breaking a kiosk that nobody reloads for days.

---

## `useClock`

```ts
export interface ClockReading {
  readonly now: Date;
}

export function useClock(): ClockReading;
```

**Behaviour**
- Returns the current time, updated once per second (spec FR-002, FR-003).
- Each tick calls `new Date()` **fresh**. The displayed value is never derived by adding to a previous value.
- Renders once per second and no more.

**Lifecycle guarantees**
- Registers exactly one `setInterval` per mounted instance.
- Clears that interval in the effect's cleanup function.
- Survives React StrictMode's development double-mount without leaving a second interval running (research R8).

**Why fresh-read matters**: `setInterval` fires late under CPU pressure, background throttling, or OS sleep/resume. Re-reading the wall clock means a late tick still shows the correct time — drift affects *when* the number changes, never *what it says*. This is what makes SC-002 ("never drifts from real time by more than one second") hold across a 72-hour run.

**Test contract** (`useClock.test.ts`)
1. Advancing fake timers by 1 s produces an updated `now`.
2. After unmount, `vi.getTimerCount() === 0`.

---

## `useIdleReset`

```ts
export interface UseIdleResetOptions {
  readonly durationSeconds: number;   // default: IDLE_TIMEOUT_SECONDS (60)
  readonly onExpire: () => void;
}

export interface IdleResetState {
  readonly remainingSeconds: number;
}

export function useIdleReset(options: UseIdleResetOptions): IdleResetState;
```

**Behaviour**
- Exposes whole seconds remaining until auto-reset, for the footer readout (spec FR-017).
- Any `pointerdown` or `keydown` anywhere on `document` resets the countdown to its full duration (spec FR-018).
- On reaching zero, calls `onExpire()` exactly once, then restarts a full cycle (spec FR-019).

**Implementation contract** (each clause exists to prevent a specific known failure)

| Rule | Failure it prevents |
|---|---|
| Countdown derives from an absolute `deadline` epoch-ms ref, not a decrementing counter | Accumulated drift and under-counting after throttling or sleep |
| Interaction handlers rewrite the ref, never call `setState` directly | A re-render per touch, and effect re-subscription churn |
| `onExpire` is held in a ref, refreshed each render; it is **not** in the effect dependency array | The classic leak: a caller passing an inline arrow tears down and re-creates the interval every render, or orphans one |
| Interval ticks at 250 ms but `setState` fires only when the integer second changes | Four renders per second forever on an always-on display |
| `pointerdown` registered `{ passive: true }` | Blocking the compositor on every touch, hurting SC-003 responsiveness |
| Interval and **both** listeners removed in the same cleanup | The leak this whole contract exists to prevent |

**Lifecycle guarantees**
- Exactly one interval and exactly two document listeners per mounted instance.
- After unmount: zero pending timers, zero listeners still attached.
- Changing the `onExpire` identity between renders MUST NOT create, destroy, or duplicate the interval or listeners.

**Test contract** (`useIdleReset.test.ts` — the required coverage named in the technical input)
1. **Resets on interaction**: advance timers partway, dispatch `pointerdown` on `document`, assert `remainingSeconds` is back to full. Repeat for `keydown`.
2. **Fires at zero**: advance past `durationSeconds`, assert `onExpire` called exactly once.
3. **No interval leak**: after unmount, `vi.getTimerCount() === 0`.
4. **No listener leak**: spy on `document.addEventListener` / `removeEventListener`; assert every added listener is removed with the same type and reference.
5. **Stable across callback identity change**: re-render with a new inline `onExpire`; assert the timer count has not increased and the countdown did not restart.
6. **Never negative**: `remainingSeconds >= 0` at every observed tick.

---

## Integration with `KioskContext`

`useIdleReset` is called **once**, in the provider at the app root, with:

```ts
useIdleReset({
  durationSeconds: IDLE_TIMEOUT_SECONDS,
  onExpire: resetInteractionState,
});
```

`resetInteractionState()` sets `activeTab` back to `DEFAULT_TAB_ID` (`'board-agenda'`) and clears transient interaction state. It **MUST NOT** reset `locale` — see [data-model.md](../data-model.md) §4.

> **Deviation from the technical input**: the input specified `onExpire` resets "to campus map". Campus Map is not a tab in this feature; spec FR-015 and FR-019 both name **Board Agenda**, and `'campus-map'` would not satisfy the derived `TabId` type. Flagged in [plan.md](../plan.md) § Deviations.

Calling the hook once at the root — rather than per component — means one interval for the whole app, and makes "any touch anywhere resets it" (FR-018) fall out of the document-level listeners rather than requiring prop-drilled handlers on every element.
