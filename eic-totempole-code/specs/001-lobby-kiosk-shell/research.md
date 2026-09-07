# Phase 0 Research: Lobby Kiosk Shell

**Feature**: `001-lobby-kiosk-shell` | **Date**: 2026-09-04 | **Plan**: [plan.md](./plan.md)

Resolves the open technical questions implied by the Technical Context. Each item records the decision, why it was chosen, and what was rejected.

---

## R1 — rem anchor for the 1920×1280 design viewport

**Decision**: Anchor the scale at `html { font-size: 16px }` (so `1rem = 16px` at the design viewport) and express every size in the token file in `rem`. Expose a single `--scale` multiplier on `:root` that is *not* used for a responsive range but exists as a one-line physical-legibility uplift after on-device testing.

**Rationale**: The Surface Hub already does the "make it physically large" work — at 200% Windows scaling on a 50" panel, 1 CSS px ≈ 2 device px, and 16 px of CSS type renders roughly 9 mm tall, comfortably readable at 2–3 m. Anchoring at 16 px also means the reference mockup's Tailwind-default scale transfers 1:1, so proportions lifted from the mockup need no arithmetic. It keeps touch-target maths clean: the 64 px constitutional minimum is exactly `4rem`.

**Alternatives considered**:
- *Larger root (20–24 px) to "compensate for a big screen"* — rejected: double-compensates against the 200% OS scaling and would silently invalidate every proportion taken from the mockup.
- *`vw`/`vh`-based fluid type* — rejected: this is a single fixed viewport, so fluid sizing adds indirection with zero benefit and makes the no-overflow guarantee harder to reason about.
- *`px` throughout* — rejected: loses the single-knob uplift if on-device review finds the type too small.

---

## R2 — Self-hosted typefaces

**Decision**: Ship **variable** `woff2` files for both families from `public/fonts/` at stable, unhashed paths, declared in `src/styles/fonts.css` and `<link rel="preload" as="font" type="font/woff2" crossorigin>`-ed from `index.html`. Use `font-display: block`. Both families are SIL Open Font License 1.1, so self-hosting and redistribution are permitted; include the OFL text alongside the files.

- Space Grotesk (variable, weight axis ≈ 300–700) — headlines, numeric stats (clock, temperature, countdown)
- Plus Jakarta Sans (variable, weight axis ≈ 200–800) — body and UI copy

**Rationale**: The kiosk may sit on a restricted network, so a CDN request is an availability risk on every cold start — a font that fails to load is a visibly broken kiosk nobody is watching. Two variable files cover every weight the design needs in two requests instead of seven. `public/` (rather than `src/assets/`) gives stable URLs, which makes the `preload` link trivial to write and keeps the CloudFront cache policy simple; fonts effectively never change, so losing Vite's content hashing costs nothing. `font-display: block` is correct here specifically *because* the fonts are local: they resolve in tens of milliseconds, and a brief invisible-text moment is preferable to a visible reflow on a display people are watching from across a lobby.

**Alternatives considered**:
- *Google Fonts CDN* — rejected outright by the restricted-network constraint and Constitution VIII.
- *Static per-weight `woff2` files* — rejected: more requests and more bytes for the same coverage.
- *`src/assets/fonts/` with Vite hashing* — rejected: hashed filenames make the `preload` link awkward to author, for a caching benefit these files don't need.
- *`font-display: swap`* — rejected: trades an invisible-text flash for a layout-shift flash, which is the more noticeable failure on a large always-on display.

**Verify at implementation**: confirm the actual `wght` axis range of the downloaded files and match the `@font-face` `font-weight` range to it.

**Post-implementation amendment** (2026-09-06): the "verify at implementation" step failed — an intermediate variable-file build shipped with only a 400-weight face reachable, verified flat in-browser (the hero headline measured 728.3px wide at both `font-weight: 400` and `700`, i.e. no distinct bold face was actually rendering; the design had never been seen as specified). The decision was revised to **static per-weight `woff2` files** (400 and 700, the two weights the design actually uses) instead of a variable file, which the Alternatives list above had rejected on request-count grounds alone, without anticipating this failure mode. This trades two extra HTTP requests (four files instead of two, still all local/preloaded, so Constitution VIII and the restricted-network rationale are unaffected) for two faces that are verifiably distinct. See `src/styles/fonts.css` for the current `@font-face` declarations and `public/fonts/README.md` for the file provenance. `plan.md` § Project Structure has been updated to match.

---

## R3 — Localization without an i18n library

**Not covered by the supplied technical input.** FR-007 (added by `/speckit.clarify`) requires the header, hero, nav tab labels and footer text to render in the selected language.

**Decision**: A dependency-free, fully-typed two-tier string model.

1. **Shell chrome copy** lives in `src/i18n/strings.ts` as `const strings = { en: {...}, hu: {...} } satisfies Record<Locale, ShellStrings>`. Because `ShellStrings` is a single interface applied to both locales, a key present in `en` but missing in `hu` is a compile error.
2. **Tab labels live inside their own tab folder** as `label: Record<Locale, string>` on the tab's `meta`, not in the central string map.

`Locale` is `'en' | 'hu'`. The active locale lives in `KioskContext`; a `useStrings()` hook returns `strings[locale]`.

**Rationale**: Adding a runtime i18n library for two locales and ~12 strings would violate the "no external state library / minimal dependency" posture for no benefit — there is no pluralisation, no date/number localisation beyond `toLocaleString`, and no translator workflow. Critically, keeping tab labels *in the tab folder* is what preserves the explicit requirement that adding a tab is "one folder and one registry line, nothing else" — a central key map would make it one folder, one registry line, **and two edits to a shared file**, which also weakens Constitution Principle IX (module isolation).

**Alternatives considered**:
- *`react-i18next` / `formatjs`* — rejected: a bundle and a provider for two locales of static chrome copy.
- *Central `strings.tabs[labelKey]` map with typed keys* — rejected: breaks the one-folder-one-line extensibility requirement and couples every tab to a shared file.
- *Duplicating the whole component tree per locale* — rejected: unmaintainable.

**Note**: per spec Assumptions, locale is a display setting, **not** visitor-entered data — `resetInteractionState()` must therefore *not* reset it.

---

## R4 — Timer strategy for multi-day unattended uptime

**Decision**:

- **`useClock`**: one `setInterval(…, 1000)` that calls `new Date()` fresh on every tick and stores it in state. Cleared in the effect cleanup.
- **`useIdleReset`**: hold an absolute `deadline` timestamp (`Date.now() + durationMs`) in a ref; a 250 ms interval derives `remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))` and **only calls `setState` when the integer second actually changes**. Interaction handlers rewrite the ref, not state, so a reset never re-subscribes anything.
- **`onExpire` is stored in a ref** and refreshed in a layout effect, so the interval and document listeners are attached exactly once for the lifetime of the hook regardless of how often the caller's callback identity changes.
- Listeners: `pointerdown` and `keydown` on `document`, `pointerdown` registered `{ passive: true }`, both removed in the same effect cleanup that clears the interval.

**Rationale**: This is the design that Constitution Principle V is actually about. Two failure modes matter over a 72 h+ unattended run: (a) **interval drift/accumulation** — solved by deriving the display from an absolute deadline and a freshly-read wall clock rather than decrementing a counter, so a late or coalesced tick self-corrects instead of accumulating error, including across OS sleep/resume; and (b) **orphaned intervals** — the classic React leak where an `onExpire` prop that changes identity every render causes the effect to tear down and re-create the interval endlessly, or worse, re-subscribe without cleaning up. Holding the callback in a ref removes the callback from the effect's dependency array entirely. Ticking at 250 ms while only setting state on whole-second changes keeps the countdown visually crisp at the moment of transition without four renders a second.

For the clock, reading `new Date()` each tick means the *displayed value* is always correct even if the tick itself fires late — drift shifts when the update happens, never what it says. That is what satisfies SC-002 ("never drifts from real time by more than one second").

**Alternatives considered**:
- *Decrementing counter (`setSeconds(s => s - 1)`)* — rejected: accumulates error, and silently under-counts after any tab throttling or sleep. This is exactly what the reference mockup does.
- *Self-correcting `setTimeout` chain aligned to the second boundary* — viable and marginally more precise, rejected as unnecessary complexity given the value is re-read each tick.
- *One shared global timer for both hooks* — rejected: couples two independent modules for a negligible saving, against Principle IX.
- *`requestAnimationFrame` loop* — rejected: wakes ~60×/s forever on an always-on display for a once-per-second update.

---

## R5 — Compile-time-safe tab registry

**Decision**: Use `satisfies` with a `const` array and derive the id union from the registry itself:

```ts
export const TABS = [boardAgenda, localTransit, companyHighlights, guestWifi] as const
  satisfies readonly TabModule[];

export type TabId = (typeof TABS)[number]['meta']['id'];
```

`TabModule` requires `meta: { id: string; label: Record<Locale, string>; icon: LucideIcon }` and `Component: ComponentType`. `satisfies` validates every entry **without widening** the array, so `TabId` resolves to the literal union `'board-agenda' | 'local-transit' | 'company-highlights' | 'guest-wifi'`.

**Rationale**: This delivers the requested "a malformed tab entry fails at compile time" with no runtime validation code and no build plugin. The derived `TabId` then propagates: `KioskContext.activeTab` is typed `TabId`, so any attempt to set a tab that isn't registered — including the `'campus-map'` referenced in the technical input — is a type error at the call site rather than a blank content region at runtime. Each `meta.id` is additionally asserted to equal its folder name by convention, checked in the registry test.

**Alternatives considered**:
- *`const TABS: TabModule[] = [...]`* — rejected: the annotation widens `id` to `string`, destroying the literal union and the compile-time safety.
- *Zod/Valibot runtime schema* — rejected: adds a dependency to catch at runtime what the compiler catches for free, and this is authored code, not external input.
- *`import.meta.glob` auto-discovery of `src/tabs/*/`* — rejected: removes the explicit registry line the user asked for, and yields an untyped, unordered record — nav order would become filesystem-dependent, and a typo'd folder would fail silently at runtime instead of loudly at compile time.

---

## R6 — Asserting "no vertical overflow at 1920×1280"

**The problem**: jsdom implements no layout engine. `scrollHeight`, `clientHeight`, `offsetHeight` all return `0`, and `getBoundingClientRect()` returns an all-zero rect. A no-overflow assertion in the default Vitest jsdom environment would pass unconditionally and prove nothing — a false-green test on the single most important constitutional constraint (Principle II).

**Decision**: Run **two Vitest projects under one `vitest` command** via `test.projects` (Vitest 3; formerly `workspace`):

1. `unit` — `environment: 'jsdom'`, covers hooks, context and the registry render test.
2. `layout` — `@vitest/browser` with the `playwright` provider on Chromium, viewport **1920×1280**, matching `**/*.browser.test.tsx`. The overflow test mounts the full `App` and asserts `document.documentElement.scrollHeight <= document.documentElement.clientHeight` (and the same for width), for **each of the four tabs** in turn.

**Rationale**: Keeps the user's specified toolchain (Vitest + React Testing Library — RTL works in browser mode too) while making the assertion real. The alternative of a separate Playwright suite means a second runner, a second config, and a build-and-serve step in CI for one test. The cost is honest and worth naming: `@vitest/browser` + `playwright` become devDependencies and CI needs a Chromium download. Neither ships to the kiosk bundle, so Constitution VIII is untouched.

**Alternatives considered**:
- *jsdom + assert on computed `grid-template-rows` / `overflow` strings* — rejected as a false green: it verifies the CSS was authored, not that content fits.
- *Standalone Playwright E2E suite* — rejected: second runner and a serve step for a single assertion; revisit if the project later needs real E2E journeys.
- *Manual on-device check only* — rejected: this is a permanent regression risk every future tab can reintroduce, and Principle II is non-negotiable.

**Note for implementation**: the browser test is the regression net, not a substitute for verifying on the actual Surface Hub before sign-off.

---

## R7 — `100dvh` vs `100vh` for the shell container

**Decision**: `height: 100dvh` with `height: 100vh` declared immediately before it as a fallback, plus `overflow: hidden` on both `html, body` and the shell root.

**Rationale**: On a kiosk-mode Edge/Chromium window with no dynamic browser UI, `dvh` and `vh` resolve identically — so this is insurance, not a behaviour change. `dvh` is the correct modern unit if the kiosk is ever run non-fullscreen or the shell is previewed on a mobile device during development. The `overflow: hidden` is the real guarantee: combined with `grid-template-rows: auto auto auto 1fr` and `min-height: 0` on the content row, it makes overflow structurally impossible rather than merely unlikely.

**Critical implementation detail**: the `1fr` content row **must** carry `min-height: 0`. CSS Grid items default to `min-height: auto`, which refuses to shrink below their content's intrinsic size — the single most common cause of a `1fr` row overflowing its container. Any scrollable inner area a future tab needs must scroll *inside* the content region, never the page.

**Alternatives considered**:
- *`height: 100%` chain from `html`* — rejected: requires an unbroken `height: 100%` ancestry and is more fragile.
- *JS-measured viewport height* — rejected: adds a resize listener and a render dependency to solve a problem CSS already solves.

---

## R8 — React 19 StrictMode and the timer tests

**Decision**: Keep `<StrictMode>` in `main.tsx` for development, and write the hook tests to *rely* on double-invocation rather than work around it: `useIdleReset`'s test asserts that after mount→unmount there are **zero** pending timers and zero document listeners.

**Rationale**: StrictMode's development-only double mount/unmount is precisely the mechanism that surfaces missing cleanup — it is a free, always-on leak detector for exactly the failure mode Constitution Principle V forbids. A hook that survives StrictMode without duplicating its interval is a hook that survives 72 h unattended.

**Test technique**: `vi.useFakeTimers()` plus asserting `vi.getTimerCount() === 0` after unmount, and spying on `document.addEventListener`/`removeEventListener` to assert balanced pairs. This makes "without leaking intervals" — which the user named as required coverage — a concrete assertion rather than an aspiration.

---

## R9 — Kiosk base styles

**Decision**: In `reset.css`, apply globally: `overflow: hidden` on `html, body`; `overscroll-behavior: none`; `user-select: none`; `-webkit-tap-highlight-color: transparent`; `touch-action: manipulation` (suppresses the 300 ms double-tap-zoom delay); and `contextmenu` suppressed via a single listener registered in `main.tsx`. Re-enable `user-select: text` locally only if a future tab shows copyable content.

**Rationale**: These are the standard kiosk hardening set, and each maps to an observed public-kiosk failure: a visitor drag-selecting the headline into blue highlight, a long-press opening a context menu over the UI, a two-finger pan revealing white space beyond the layout, or a double-tap zooming the page to an unrecoverable state with no keyboard to undo it. `touch-action: manipulation` also directly improves perceived tab-switch latency toward SC-003.

**Alternatives considered**:
- *Relying on Edge's kiosk-mode flags alone* — rejected: couples correctness to a deployment configuration the app can't verify, and breaks entirely during local development.

---

## R10 — Accent colour usage and AA contrast

**Decision**: Base pairs `#0F172A` on `#F8FAFC` (≈16.9:1) and `#0F172A` on `#FFFFFF` (≈17.9:1) — both far past AA. The six accents (emerald, blue, violet, amber, cyan, rose) are reserved for category identity: tab icons, the event pill, and future per-tab highlights. Any accent used for **text or an essential icon** must be the ≥600-level shade against white/slate-50 and be contrast-verified; light accent shades (50/100 levels) are permitted only as fills behind dark text.

**Rationale**: Amber and cyan at their mid shades are the classic AA failures on a light background, and a lobby display is viewed at distance and off-axis, where effective contrast is worse than the nominal ratio. Encoding "accents are for identity, `#0F172A` is for reading" as a token-level rule prevents the drift where a future tab sets body copy in amber.

**Additional rule**: colour is never the *only* channel carrying meaning — the active tab is distinguished by a filled dark background plus `aria-selected`, not by hue alone (Principle VII, and the reference mockup's `tab-active` treatment already works this way).

---

## R11 — Motion and `prefers-reduced-motion`

**Decision**: Two animations exist: the header's pulsing live-status dot (FR-001) and the hero's floating geometric graphic (FR-010). Under `@media (prefers-reduced-motion: reduce)`, **disable the hero float entirely** but **keep the status pulse**, reduced to a subtle opacity fade with no transform.

**Rationale**: These two animations are not equivalent. The hero graphic is explicitly decorative (FR-010 says so, and it is `aria-hidden`), so removing it costs nothing. The pulse, however, is a **functional status signal** that FR-001 requires to be visible — silently removing it under an OS setting would drop a stated requirement. Softening it to an opacity-only fade honours the spirit of reduced-motion (no vestibular-triggering movement) while keeping the signal.

**Note**: on a shared kiosk the OS reduced-motion setting is a deployment property, not a personal preference, so this must not be the only path tested — verify both states render correctly.

---

## Resolved unknowns summary

| # | Question | Resolution |
|---|---|---|
| R1 | rem anchor | 16 px root + `--scale` uplift knob |
| R2 | Font hosting | Variable woff2 in `public/fonts/`, preloaded, `font-display: block`, OFL |
| R3 | Localization (FR-007) | Typed `Record<Locale, …>` maps; tab labels stay in the tab folder |
| R4 | Timer safety | Absolute deadline + ref-held `onExpire` + balanced cleanup |
| R5 | Registry typing | `as const satisfies readonly TabModule[]`, `TabId` derived |
| R6 | No-overflow test | Vitest browser-mode project (Playwright/Chromium) at 1920×1280 |
| R7 | Viewport unit | `100dvh` with `100vh` fallback, `overflow: hidden`, `min-height: 0` on the `1fr` row |
| R8 | StrictMode | Kept; leak assertions via `vi.getTimerCount()` + listener spies |
| R9 | Kiosk base CSS | Standard hardening set incl. `touch-action: manipulation` |
| R10 | Accent contrast | Accents for identity only; `#0F172A` for reading; never colour-only meaning |
| R11 | Reduced motion | Hero float off; status pulse retained as opacity-only |

**No NEEDS CLARIFICATION markers remain.**
