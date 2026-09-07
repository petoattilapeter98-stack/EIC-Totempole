# Quickstart & Validation Guide: Lobby Kiosk Shell

**Feature**: `001-lobby-kiosk-shell` | **Plan**: [plan.md](./plan.md)

How to set up, run, and prove this feature works. Implementation detail belongs in `tasks.md`; this document is the runnable validation path.

---

## Prerequisites

- Node.js 20 LTS or newer, npm 10+
- Chromium downloaded for Playwright (the browser-mode test project) — `npx playwright install chromium`
- The four static per-weight font files placed in `public/fonts/` (see [research.md](./research.md) R2, including its post-implementation amendment — the original plan called for variable files, but they shipped with only one weight actually rendering). Both families are SIL OFL 1.1:
  - `space-grotesk-v22-latin_latin-ext-regular.woff2` / `-700.woff2`
  - `plus-jakarta-sans-v12-latin_latin-ext-regular.woff2` / `-700.woff2`

## Setup

```bash
npm create vite@latest . -- --template react-ts   # if scaffolding fresh
npm install
npm install lucide-react
npm install -D vitest @vitest/browser @vitest/coverage-v8 \
               @testing-library/react @testing-library/jest-dom \
               @testing-library/user-event jsdom playwright
npx playwright install chromium
```

## Run

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server. **Open at exactly 1920×1280** — see below. |
| `npm run build` | Static production build to `dist/` (spec FR-022, Constitution VIII) |
| `npm run preview` | Serve the built `dist/` locally, closest to kiosk conditions |
| `npm test` | Both Vitest projects (jsdom unit + browser layout) |
| `npm run test:unit` | jsdom project only — fast inner loop |
| `npm run test:layout` | Browser-mode layout/overflow project only |
| `npx tsc --noEmit` | Type check — where the registry's compile-time guarantees are enforced |

### Reproducing the design viewport during development

The design viewport is **1920×1280 CSS px** (Surface Hub 2S, 3840×2560 at 200% scaling). On a normal monitor:

1. Chrome/Edge DevTools → Device Toolbar (`Ctrl+Shift+M`)
2. Add a custom device: **1920 × 1280, DPR 2, touch enabled**
3. Set zoom to a fit-to-window level — *only* to see it; never change the CSS to accommodate your monitor.

Verifying at any other viewport proves nothing about the kiosk (Constitution I: one target, not a responsive range).

---

## Validation scenarios

Each maps to spec acceptance scenarios and success criteria. Scenarios 1–5 are manual on-screen checks; scenario 6 is automated.

### 1. Live shell on arrival — spec User Story 1 (P1)

1. Load the app; do not touch it.
2. **Expect**: brand "Teksystem Budapest" with a visibly pulsing status dot; clock showing the correct current time; today's date; Budapest weather (temperature + condition); a language toggle in its EN state.
3. Watch the clock for 10 s. **Expect**: it advances one second at a time, no flicker, no reload.
4. **Expect** in the hero: an event pill, a large welcome headline, and a geometric graphic in gentle continuous motion.

✅ FR-001 – FR-004, FR-008 – FR-010, SC-001, SC-002

### 2. Tab navigation — spec User Story 2 (P2)

1. Confirm **Board Agenda** is active on load (FR-015).
2. Tap each of the other three tabs in turn.
3. **Expect**: the tapped tab becomes visually distinct (dark filled surface); the previously active tab returns to its inactive state; exactly one tab is ever active; the content region below immediately shows **that tab's own placeholder**, naming the tab (FR-014).
4. **Expect**: no page navigation, no URL change, no reload, no scrollbar appearing.

✅ FR-011 – FR-016, SC-003

### 3. Idle auto-reset — spec User Story 3 (P3)

1. Switch to a tab other than Board Agenda. Do not touch the screen.
2. **Expect**: the footer countdown decreases by one every second.
3. Before it reaches zero, tap anywhere. **Expect**: it jumps straight back to 60.
4. Let it run to zero. **Expect**: the active tab returns to **Board Agenda**, and interaction state is cleared.
5. **Expect**: the language selection is **unchanged** by the reset — locale is a display setting, not visitor-entered data ([data-model.md](./data-model.md) §4).

✅ FR-017 – FR-019, SC-005, SC-006

### 4. Language toggle — spec User Story 4 (P4)

1. Tap the language toggle.
2. **Expect**: header, hero headline and event pill, **all four nav tab labels**, and footer text switch to Hungarian; the toggle reflects the new state.
3. Switch tabs. **Expect**: the Hungarian copy persists (FR-006).
4. **Expect**: the per-tab placeholder text is *not* required to translate (FR-014).

✅ FR-005 – FR-007, SC-009

### 5. No-scroll and touch targets — Constitution II & III

1. At 1920×1280, on each of the four tabs: try to scroll with a two-finger drag / mouse wheel. **Expect**: nothing moves; no scrollbar exists.
2. Measure the nav tabs and language toggle in DevTools. **Expect**: each ≥ 64 × 64 px, with ≥ 16 px between adjacent targets.

✅ FR-020, FR-021, SC-004, SC-008

### 6. Automated coverage — `npm test`

| Test | Asserts | Spec |
|---|---|---|
| `useIdleReset.test.ts` | Countdown resets on `pointerdown` and `keydown`; `onExpire` fires once at zero; **zero timers and zero listeners remain after unmount**; stable across `onExpire` identity change | FR-018, FR-019, Constitution V |
| `useClock.test.ts` | Ticks once per second; no timer left after unmount | FR-002, SC-002 |
| `registry.test.tsx` | Every registered tab renders without error; ids unique; both locale labels present; four tabs in FR-011 order | FR-011, FR-014 |
| `KioskContext.test.tsx` | `resetInteractionState()` restores Board Agenda and **does not reset locale** | FR-019 + spec Assumption |
| `App.layout.browser.test.tsx` | No vertical or horizontal overflow at 1920×1280 **on every tab**; touch target sizes and gaps | FR-020, FR-021, SC-004 |

> The layout test runs in real Chromium, not jsdom — jsdom has no layout engine and would pass these vacuously ([research.md](./research.md) R6).

---

## Definition of done

- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green, both projects
- [ ] Validation scenarios 1–5 pass manually at 1920×1280
- [ ] `npm run build` emits static assets only; `dist/` contains no server runtime
- [ ] No network requests at runtime — verify the DevTools Network tab is empty after load (fonts served locally, from `public/fonts/`) (FR-022)
- [ ] Verified on the actual Surface Hub 2S before sign-off — the browser test is a regression net, not a substitute for the real panel
- [ ] Soak check: left running ≥ 1 hour with flat memory in DevTools (proxy for the 72 h SC-007 target); no growing timer or listener count

## Deployment

The infrastructure is Terraform at the **repo root**, in `infra/` — a sibling of
this app directory. **[`infra/README.md`](../../../infra/README.md) is the source
of truth for deploy commands**; the summary below exists so this guide is not
misleading, not so it can be copy-pasted in isolation.

Deployment is a two-step upload, not a single sync, because the two halves need
opposite cache headers:

| Path | `Cache-Control` | Why |
|---|---|---|
| `/assets/*`, `/fonts/*` | `public,max-age=31536000,immutable` | Vite content-hashes assets; font paths are stable |
| `index.html` | `no-cache,must-revalidate` | The kiosk must never boot an old bundle |

> ⚠️ A plain `aws s3 sync dist/ s3://<bucket>/` breaks this: it would upload
> `index.html` with a long TTL, and the kiosk could then keep serving a stale
> build indefinitely. Always upload `index.html` separately, **after** the sync
> — the sync's `--delete` would otherwise remove it.

Because `index.html` is never cached at the edge, a routine deploy needs **no
CloudFront invalidation**. Invalidate only when replacing a file under `/fonts/`.

Live dev environment: <https://dev.totempole.wisebeers.com>

Static objects only — no SSR, no Lambda, no API origin.
