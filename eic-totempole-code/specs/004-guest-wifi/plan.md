# Implementation Plan: Guest Wi-Fi Panel

**Branch**: `feature/guest-wifi` (spec directory `004-guest-wifi`) | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-guest-wifi/spec.md`

## Summary

Replace the `guest-wifi` tab's existing `TabPlaceholder` content with a real panel: a scannable
Wi-Fi QR code plus large printed SSID/password, on the same light content-region surface every
other tab uses, with a continuously glowing halo around the QR code carrying the "visually
immersive" identity (spec FR-001–FR-014). **Revised post-implementation** (2026-09-10): the panel
originally used a dedicated dark background to stand apart from the rest of the kiosk; after
seeing it running, that was reversed in favour of visual consistency with the other four tabs —
see spec.md's Clarifications and [contracts/visual-theme.md](contracts/visual-theme.md).

The whole feature is one existing tab module (`src/tabs/guest-wifi/`) gaining real content, plus
**one new runtime dependency** (`uqr`, for zero-dependency client-side QR matrix generation —
research R1) and **zero shared-chrome changes** — unlike 003-restaurant-map, this tab is already
registered and the nav grid already accommodates it.

Four findings from reading the existing code and re-deriving 003-restaurant-map's precedents shape
the design:

1. **No shared-chrome work is needed at all.** `guest-wifi` has been in `TABS` since
   001-lobby-kiosk-shell, and 003-restaurant-map already fixed the nav's column count to be
   registry-driven. This plan touches exactly one folder.
2. **Attract-mode dimming (FR-010) is already free.** `ContentRegion`'s className carries the
   shell's `.recede` class, which the `.attract` state fades to 16% opacity — this cascades onto
   whatever this tab renders with zero feature-specific code, the same structural finding as
   003-restaurant-map's R6.
3. **The QR code needs to be rendered independently of the panel's own theme.** The clarification
   locking the QR to plain black-on-white forces the QR to be its own small "light plate" element,
   built from a raw encoded matrix rather than a themed/styled renderer (research R1, R3) — a
   guarantee that turned out to matter for a different reason than originally planned once the
   panel itself became light too: the plate now needs its own border/shadow to stay visually
   distinct from its surroundings, rather than relying on white-on-navy contrast for free.
4. **SSID/password length has a real, non-arbitrary ceiling.** IEEE 802.11 already bounds SSID to
   32 bytes and a WPA passphrase to 63 characters, which satisfies Constitution II's "explicit
   strategy for unbounded content" requirement without inventing a display-specific limit
   (research R6).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: react, react-dom, lucide-react (all existing) — **plus one new
dependency, `uqr`** (zero-dependency, TypeScript-native QR matrix encoder; research R1). No other
new dependency: no i18n library, no state library, no image/QR service.

**Storage**: Two sources (added post-implementation, User Story 4): a static in-repo TypeScript
module (`wifiConfig.static.ts`, spec FR-004) as the default, and an optional operator-saved
override in this device's own `localStorage` (`wifiConfig.storage.ts`, spec FR-015–FR-019,
research R9) that takes precedence when present. Still no backend, no network fetch, no sync.

**Testing**: Vitest 3, the existing two projects — `unit` (jsdom) for the QR payload/escaping
contract, config validation, and component/cleanup behaviour; `layout` (real Chromium at
1920x1280 via Playwright) for no-scroll and the dark-panel/glow visual states.

**Target Platform**: Chromium on Microsoft Surface Hub 2S, 1920x1280 CSS px, touch-only, multi-day
uptime.

**Project Type**: Static single-page application (Vite build, `dist/` static output). No server
component.

**Performance Goals**: QR matrix + SVG generated synchronously on mount, well under one frame
(pure computation on a short string — no measurable budget risk); zero added timers while the tab
is mounted, zero when it is not (research R4).

**Constraints**: No page scroll; the QR code's own colours are fixed regardless of theme/attract
state (Clarifications Q1); the panel uses the same light content-region surface as every other
tab, with only the QR glow carrying the visual-attention role (Clarifications, post-implementation
revision); no credential/backend involved; no modal/route/popup; WCAG AA, reusing already-verified
`tokens.css` pairs (contracts/visual-theme.md).

**Scale/Scope**: 1 tab module gaining real content (~8–9 files, mostly new); 1 new dependency; 0
shared-chrome changes.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design.*

| # | Principle | Verdict | How this design satisfies it |
|---|-----------|---------|------------------------------|
| I | Kiosk-First Hardware Target | **PASS** | Built and verified only at 1920x1280. No hover affordance: SSID/password are always visible as plain text (FR-003), never hover- or tap-revealed. No right-click, no keyboard requirement. |
| II | Fixed 3:2 Viewport, No Scroll | **PASS** | SSID/password are bounded by the real IEEE 802.11 protocol ceilings (32/63 chars), not an invented display limit, and the layout is sized for that worst case (research R6, FR-008). The QR plate has a fixed size derived from the encoded matrix. |
| III | Minimum Touch Target Sizing | **PASS** | Originally display-only (FR-011). User Story 4 added real interactive elements — Edit, Save, Cancel, and the two security-type toggle buttons — all sized to `--touch-target-min` (64px) and asserted in `GuestWifi.browser.test.tsx`. |
| IV | Single-Page, Inline-Only Updates | **PASS** | No route, no modal, no popup. The dark panel is this tab's own root element rendered into the existing content region — a themed subtree, not an overlay (FR-007). |
| V | Unattended Multi-Day Reliability | **PASS** | Zero JavaScript timers added. The glow is a pure CSS `@keyframes` animation that starts/stops with mount/unmount automatically (research R4); the QR matrix is computed once per mount, not polled or cached across mounts. No accumulating state. |
| VI | Zero Secrets in the Client Bundle | **PASS** | The guest network's SSID/password are visitor-facing published information, not an application credential to a third-party service acting on the visitor's behalf — but the design still follows Principle VI's spirit exactly like `MAP_ID` in 003-restaurant-map: a plain static module constant, not routed through `import.meta.env`, no backend, no runtime fetch (research R1's rejection of a public QR-image API is the concrete case this principle rules out). The device-local `localStorage` override (User Story 4, research R9) is the same posture: nothing shipped in the built bundle, an operator's own entry on their own device. |
| VII | Accessibility Baseline | **PASS** | The QR `<svg>` is `aria-hidden="true"`; the printed SSID/password text is the real, screen-reader-reachable source of truth (contracts/visual-theme.md §2). Text colours are not new pairs at all — they reuse the exact `--color-text`/`--color-text-muted` on `--color-surface` tokens every other tab already uses (17.85:1 / 5.1:1, both documented in `tokens.css`). The glow respects `prefers-reduced-motion` (research R4). The edit form's inputs carry real `<label>`/`aria-label` associations (contracts/config-editing.md §4). |
| VIII | Static-First Delivery | **PASS** | The QR is computed client-side from already-bundled static data with zero network calls — no live third-party dependency exists in this feature at all (research R1's detailed rationale distinguishes this from 003-restaurant-map's justified Maps-embed deviation). `localStorage` reads/writes (User Story 4) are synchronous local browser calls, not a backend dependency — research R9 states explicitly why this doesn't weaken the principle. No deviation to record. |
| IX | Modular Feature Isolation | **PASS, zero shared-chrome changes** | All feature code and all new colour tokens live inside `src/tabs/guest-wifi/` (research R5). `tokens.css`, `TabNav`, and `registry.ts` are untouched — a strictly smaller footprint than 003-restaurant-map, which needed one shared CSS line changed. Deleting the folder returns the tab to its placeholder state. |

**Gate result: PASS.** No violations, no deviations, no Complexity Tracking entries required.

### Post-Phase-1 re-evaluation

Re-checked after `research.md`, `data-model.md`, and the two contracts were written. **Still PASS.**
Design work tightened two things beyond the initial gate pass:

- **Principle VII** got more specific: rather than asserting "contrast will be fine," the design
  reuses *already-verified* `tokens.css` pairings — originally white/navy at 17.33:1 for the dark
  version, later (post-implementation revision) `--color-text`/`--color-surface` at 17.85:1 for
  the light version — instead of introducing new colour math to review either way
  (contracts/visual-theme.md §1).
- **Principle VIII**'s PASS verdict was the one place a plausible reviewer objection existed
  ("isn't generating a QR at render time 'dynamic'?"); research R1 now states explicitly why that
  objection doesn't apply here, so a future reviewer does not have to re-derive the distinction.

No new violations were introduced by the Phase 1 design.

### Post-implementation re-check (T027)

Re-checked against the finished code in `src/tabs/guest-wifi/`. **Still PASS, no drift**:

- Principle V: `grep -rE "setTimeout|setInterval|useEffect" src/tabs/guest-wifi` returns zero
  matches — the feature has no JavaScript timer or lifecycle hook of any kind, confirming
  research R4's prediction exactly rather than merely approximating it.
- Principle VI/VIII: `npm run build` followed by a grep of `dist/` for network-call patterns
  found only Vite's module-preload polyfill and React DOM's resource-hint APIs
  (`fetchPriority`, `prefetchDNS`) — both framework internals, no QR/credential network call
  exists (T024).
- Principle IX: `git diff --stat` against `main` touches only `src/tabs/guest-wifi/*` plus
  `package.json`/`package-lock.json` — zero shared-chrome files changed (T023), a strictly
  smaller footprint than even the zero-shared-chrome claim implied, since no test needed
  updating in any other tab's folder either.
- Full suite: 144/144 unit tests and 17/17 layout tests pass (`npm run test:unit`,
  `npm run test:layout`), including every pre-existing test outside this feature — no
  regression anywhere else in the app.

### Post-implementation revision: dark background → light background

After T027, the dark-background design was reversed: the panel now uses the same
`--color-surface` white card every other tab renders into, removing the local `--gw-bg`/
`--gw-text`/`--gw-text-soft` custom properties entirely in favour of the shared tokens
`board-agenda`/`restaurant-map` already use. The glow's opacity range was also retuned down
(`0.32`–`0.6`, from a wider range) since full-strength colour reads differently against white
than against navy. See spec.md's Clarifications, [research.md](research.md) R5, and
[contracts/visual-theme.md](contracts/visual-theme.md) for the updated rationale. Re-ran the full
suite after the change: 144/144 unit, 17/17 layout — no regressions. The Constitution Check
verdicts above are unaffected (still all PASS); Principle VII's entry was updated in place to
cite the new token pairing rather than the old one.

### Post-implementation revision 2: glow scoped to the QR plate → glow across the whole panel

Direct user feedback: the glow confined to a halo around the QR code "doesn't really fit into the
page" and should "affect the whole panel" instead. The glow moved from `.qrFrame::before/::after`
(removed, along with the now-unnecessary `.qrFrame` wrapper) to `.root::before/::after` — two
blobs sized to roughly the top and bottom halves of the whole panel, opacity retuned down further
(`0.16`–`0.26`, from `0.32`–`0.6`) since a wash covering the panel now sits directly behind body
text rather than beside it. See [contracts/visual-theme.md](contracts/visual-theme.md) §4 for the
full rationale, including the stacking-order detail (`z-index: 1` on every real content element)
that keeps the wash from painting over the credential text. Re-ran the full suite: 144/144 unit,
17/17 layout — no regressions. Verified visually in-browser in both the configured and
not-configured states.

### Feature addition: on-screen config editing (User Story 4)

Real new scope, not a revision: an "Edit" control that opens an inline form (network name,
password, WPA/open toggle, Save/Cancel) within the same panel, backed by a new
`wifiConfig.storage.ts` module (`localStorage`, research R9) and a new
[contracts/config-editing.md](contracts/config-editing.md). `GuestWifi.tsx` was restructured so
`GuestWifiPanel` (the testable, presentational core) takes an `onSave` callback and never touches
storage itself — only the top-level `GuestWifi` component resolves `storedOverride ?? WIFI_CONFIG`
and calls `saveConfigOverride`. No access control was added (research R10). Constitution Check
rows III, VI, VII, and VIII above were updated in place to reflect the new interactive elements
and storage; all still PASS. Verified end-to-end in-browser (edit → save → QR regenerates →
survives a full page reload) and via the full suite: 164/164 unit, 21/21 layout — no regressions.

## Project Structure — updated (User Story 4)

```text
src/tabs/guest-wifi/
├── wifiConfig.storage.ts       # NEW — validateConfigInput, loadStoredConfig, saveConfigOverride
├── wifiConfig.storage.test.ts  # NEW — validation + localStorage round-trip (unit)
├── GuestWifi.tsx               # MODIFIED — edit mode, EditForm, onSave wiring
├── GuestWifi.module.css        # MODIFIED — .headerRow, .editButton, .editForm and field/button styles
├── strings.ts                  # MODIFIED — editor copy (EN/HU)
├── GuestWifi.test.tsx          # MODIFIED — US4 edit-flow and persistence tests added
└── GuestWifi.browser.test.tsx  # MODIFIED — no-scroll in editor state, new touch-target assertions
```

Still zero shared-chrome changes and zero new runtime dependencies — `localStorage` is a browser
built-in.

## Project Structure

### Documentation (this feature)

```text
specs/004-guest-wifi/
├── plan.md              # This file
├── spec.md              # Feature specification (input)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   ├── wifi-qr-payload.md   # WIFI: URI format, escaping rule, test vectors
│   ├── visual-theme.md      # Panel glow, QR plate structure, contrast table
│   └── config-editing.md    # On-screen editor: component split, validation, storage (US4)
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit-specify)
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
package.json                          # MODIFIED: + "uqr" dependency

src/
└── tabs/
    └── guest-wifi/                   # EXISTING folder, gaining real content
        ├── meta.ts                   # UNCHANGED — id/label/icon/accent already correct
        ├── index.tsx                 # MODIFIED — renders GuestWifi instead of TabPlaceholder
        ├── GuestWifi.tsx             # NEW — panel component: layout, fallback, a11y wiring
        ├── GuestWifi.module.css      # NEW — dark theme tokens, glow keyframes, QR plate layout
        ├── wifiConfig.static.ts      # NEW — GuestNetworkConfig constant (SSID/password/type)
        ├── qr.ts                     # NEW — buildWifiQrPayload() + matrix→SVG-props helper
        ├── strings.ts                # NEW — EN/HU instructional copy
        ├── wifiConfig.test.ts        # NEW — data-model.md §1 validation rules (unit)
        ├── qr.test.ts                # NEW — contracts/wifi-qr-payload.md test vectors (unit)
        ├── GuestWifi.test.tsx        # NEW — fallback state, language switch, cleanup (unit)
        └── GuestWifi.browser.test.tsx # NEW — no-scroll, QR plate colours fixed (layout)
```

**Structure Decision**: The existing tab-module pattern (001's
[tab-module.md](../001-lobby-kiosk-shell/contracts/tab-module.md)) is used unchanged — every new
file lives under `src/tabs/guest-wifi/`, which already exists. `index.tsx` is the only file
*replaced* rather than added, swapping its `TabPlaceholder` usage for the real component per the
contract's own reference pattern. `package.json` is the only file outside the tab folder that
changes, for the one new dependency. This keeps Principle IX's removability property fully intact:
deleting the folder's contents and reverting `index.tsx` returns the app to its pre-feature state
with no registry or shared-chrome edits to undo.

## Complexity Tracking

*No entries. The Constitution Check gate passed with no violations and no deviations — see the
table above.*
