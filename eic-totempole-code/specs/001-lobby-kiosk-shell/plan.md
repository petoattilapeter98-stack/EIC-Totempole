# Implementation Plan: Lobby Kiosk Shell

**Branch**: `001-lobby-kiosk-shell` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-lobby-kiosk-shell/spec.md`

## Summary

Build the persistent, non-scrolling shell for the Teksystem Budapest lobby kiosk: a header bar (branding + pulsing live dot, one-second clock, static Budapest weather, EN/HU toggle), a hero banner (event pill, welcome headline, animated decorative geometry), a four-tab navigation row, a content region that absorbs all remaining height and renders the active tab's placeholder, and a footer idle countdown that resets on any interaction and returns the kiosk to Board Agenda at zero.

Technical approach: a single React 19 + TypeScript SPA built by Vite to static assets, styled with CSS Modules over one custom-property token file, with no component library, no CSS framework, no router, and no state library. The app shell is a `100dvh` CSS Grid with explicit rows (`auto auto auto 1fr`) so the content region mathematically cannot overflow. Tabs are self-contained folders behind a compile-time-typed registry that both the nav and the content region render from. All timers live in two cleanup-complete custom hooks (`useClock`, `useIdleReset`). Localization is a dependency-free typed string map, with each tab carrying its own EN/HU label so adding a tab stays a one-folder, one-line change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19, targeting ES2022

**Primary Dependencies**: React 19 (`react`, `react-dom`), `lucide-react` (icons). Build: Vite 6.x with `@vitejs/plugin-react`. No component library, no CSS framework, no router, no state library, no i18n library.

**Storage**: N/A — no persistence in this feature. All state is in-memory React state; nothing is written to `localStorage`, cookies, or any backend.

**Testing**: Vitest 3.x + React Testing Library. Two Vitest projects under one `vitest` command: a `jsdom` project for hooks/registry unit tests, and a **browser-mode project** (Playwright/Chromium, viewport 1920×1280) for the layout/no-overflow assertion, which jsdom physically cannot make (see [research.md](./research.md) R6).

**Target Platform**: Microsoft Surface Hub 2S, 50", 3840×2560 native, 3:2, 200% Windows scaling → **1920×1280 CSS px** design viewport. Edge/Chromium, kiosk/fullscreen, touch-only input.

**Project Type**: Static single-page frontend application (no backend, no SSR).

**Performance Goals**: Cold start to fully-painted shell < 2 s on device; tab switch visually complete within one frame budget (< 100 ms perceived); hero graphic animation holds ~60 fps; clock never displays a value more than 1 s from real time (SC-002).

**Constraints**: Zero vertical or horizontal page scrolling at 1920×1280 in every tab state (FR-020). Minimum 64 px touch target with ≥16 px separation between adjacent targets (FR-021). No network calls at runtime — fonts, icons, weather and event copy are all local/static (FR-022). Must run unattended for ≥72 h with flat memory and no manual reload (SC-007): every interval and document listener is torn down in its effect cleanup and no collection grows without bound. WCAG AA contrast; every interactive element keyboard-reachable and screen-reader labelled.

**Scale/Scope**: One kiosk instance, one page, one anonymous visitor persona. ~5 shell components, 4 tab placeholder modules, 2 custom hooks, 1 context provider, 1 token file. No routes, no entities persisted, no auth.

### Deviations from the supplied technical input

| Input said | Plan does | Why |
|---|---|---|
| `onExpire` "resets active tab to **campus map**" | Resets to **Board Agenda** | Campus Map is not a tab in this feature. Spec FR-015 (default tab) and FR-019 (idle-reset target) both specify Board Agenda, and the spec's Assumptions explicitly exclude the mockup's Campus Map / Express Check-In tabs. With the compile-time-typed registry, `'campus-map'` would not typecheck. **Raise this if a fifth tab was actually intended.** |
| Tab metadata is `{ id, label, icon }` with `label` a string | `label` is `Record<Locale, string>` (e.g. `{ en: 'Board Agenda', hu: 'Testületi Napirend' }`) | FR-007 (added by `/speckit.clarify`) requires nav tab labels to translate with the EN/HU toggle. Keeping both labels **inside the tab folder** — rather than in a central i18n key map — preserves the "adding a tab means adding one folder and one registry line, nothing else" requirement and Constitution Principle IX (module isolation). |
| Vitest + React Testing Library (implied jsdom) | Vitest + RTL, **plus** a browser-mode project for the one layout test | jsdom has no layout engine: `scrollHeight`, `clientHeight` and `getBoundingClientRect()` all return 0, so "renders with no vertical overflow at 1920×1280" is unassertable there. See [research.md](./research.md) R6. |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0.

| # | Principle | Gate | Status |
|---|---|---|---|
| I | Kiosk-First Hardware Target | Built and tested only at the 1920×1280 CSS viewport; no responsive breakpoint range; no `:hover`-only affordances; no right-click; no hardware keyboard required for any action | **PASS** — single fixed viewport; all state changes are driven by `pointerdown`/click on ≥64 px targets. Hover is used only as a non-essential visual enhancement, never to reveal content or affordances. No forms in this feature, so no on-screen-keyboard surface either. |
| II | Fixed 3:2 Viewport, No Vertical Scroll | Every screen state fills 1920×1280 exactly, no scrolling under any content state | **PASS** — `100dvh` grid, rows `auto auto auto 1fr`, `overflow: hidden` on the shell root. Placeholders are fixed-size and cannot grow. Enforced by a browser-mode regression test. |
| III | Minimum Touch Target Sizing | ≥64×64 px hit area, ≥16 px separation between adjacent targets | **PASS** — `--touch-target-min: 4rem` and `--touch-gap-min: 1rem` tokens applied to the 4 nav tabs and the language toggle (the only interactive elements). Padding, not just the icon, forms the target. |
| IV | Single-Page, Inline-Only Updates | No routes, no modals, no popups, no `alert`/`confirm`/`window.open` | **PASS** — no router dependency at all; tab switching is a context state change re-rendering the content region in place. |
| V | Unattended Multi-Day Reliability | Every timer/listener torn down on unmount; no unbounded state growth | **PASS** — `useClock` and `useIdleReset` each clear their interval and remove their document listeners in the effect cleanup; `onExpire` is held in a ref so a changing callback identity never re-subscribes or orphans an interval. State is a fixed set of scalars (active tab id, locale, remaining seconds, current time) — nothing accumulates. Verified by a leak-assertion test. |
| VI | Zero Secrets in the Client Bundle | No API key, token, or credential in client code, config, or build-time env | **PASS** — trivially satisfied: the feature makes no authenticated calls and no network calls at all. |
| VII | Accessibility Baseline Despite Touch-First | WCAG AA contrast; every interactive element keyboard-reachable and screen-reader labelled | **PASS** — `#0F172A` on `#F8FAFC` ≈ 16.9:1 and on `#FFFFFF` ≈ 17.9:1. Nav is a real `role="tablist"` of `<button>`s with roving focus and `aria-selected`; the language toggle is a `<button>` with `aria-label` and `aria-pressed`. The hero graphic is `aria-hidden="true"` (decorative). The clock exposes `<time datetime>`; the countdown is `aria-live="off"` to avoid a screen reader announcing every second. Accent colours are verified for AA before any text use. |
| VIII | Static-First Delivery | Anything servable as a static asset must be | **PASS** — `vite build` emits static HTML/CSS/JS/woff2 to S3 behind CloudFront. Fonts are self-hosted locally (no CDN, per restricted-network constraint). No server runtime, no SSR, no API. |
| IX | Modular Feature Isolation | Each feature removable without breaking others; no cross-feature reach-in | **PASS** — each tab is a self-contained folder (component + meta + its own CSS Module + its own EN/HU labels), touched only through the registry. Deleting a tab folder and its one registry line removes it cleanly; no tab imports another tab's internals. |

**Result: 9/9 PASS. No violations — Complexity Tracking table omitted.**

**Post-Phase-1 re-check**: re-evaluated after design artifacts were written. Still 9/9 PASS; the Phase 1 design introduced no new dependency, no persistence, no network call, and no cross-module coupling. The one design decision worth recording against Principle I is the browser-mode test project — it is a **dev/test-time** dependency (Playwright/Chromium) that ships nothing to the kiosk bundle, so Principle VIII (static-first delivery) is unaffected.

## Project Structure

### Documentation (this feature)

```text
specs/001-lobby-kiosk-shell/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify + /speckit-clarify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── tab-module.md    # The contract every src/tabs/<name>/ folder must satisfy
│   ├── hooks.md         # useClock / useIdleReset signatures and lifecycle guarantees
│   └── ui-structure.md  # DOM landmark, a11y and layout contract for the shell
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
public/
└── fonts/                            # Self-hosted, stable paths, preloaded (no CDN)
    ├── space-grotesk-variable.woff2
    └── plus-jakarta-sans-variable.woff2

src/
├── main.tsx                          # createRoot + StrictMode
├── app/
│   ├── App.tsx                       # Composes header / hero / nav / content / footer
│   ├── App.module.css                # 100dvh grid: auto auto auto 1fr, overflow hidden
│   └── App.layout.browser.test.tsx   # Browser-mode: no vertical overflow at 1920x1280
├── components/
│   ├── HeaderBar/                    # Branding + pulse, clock, weather, language toggle
│   ├── HeroBanner/                   # Event pill, headline, animated geometric SVG
│   ├── TabNav/                       # role="tablist" rendered from the registry
│   ├── ContentRegion/                # role="tabpanel", renders active tab's component
│   └── FooterBar/                    # Idle countdown readout
├── context/
│   ├── KioskContext.tsx              # activeTab, setActiveTab, locale, setLocale, resetInteractionState
│   └── KioskContext.test.tsx
├── hooks/
│   ├── useClock.ts
│   ├── useClock.test.ts
│   ├── useIdleReset.ts
│   └── useIdleReset.test.ts          # Reset-on-interaction, onExpire at zero, no interval leak
├── i18n/
│   ├── locales.ts                    # type Locale = 'en' | 'hu'; LocalizedText
│   └── strings.ts                    # Shell chrome copy, Record<Locale, ShellStrings>
├── styles/
│   ├── tokens.css                    # THE single custom-property token file
│   ├── fonts.css                     # @font-face declarations
│   └── reset.css                     # Minimal reset + no-scroll/no-select kiosk base
├── tabs/
│   ├── registry.ts                   # Typed array; `satisfies` makes malformed entries fail to compile
│   ├── registry.test.tsx             # Renders every registered tab without error
│   ├── board-agenda/{index.tsx,meta.ts,BoardAgenda.module.css}
│   ├── local-transit/{index.tsx,meta.ts,LocalTransit.module.css}
│   ├── company-highlights/{index.tsx,meta.ts,CompanyHighlights.module.css}
│   └── guest-wifi/{index.tsx,meta.ts,GuestWifi.module.css}
└── types/
    └── tab.ts                        # TabMeta, TabModule, derived TabId union

index.html                            # Font preload links, #root
vite.config.ts                        # React plugin + Vitest projects (jsdom + browser)
tsconfig.json                         # strict: true
package.json
```

**Structure Decision**: Single static frontend project rooted at the working directory (`eic-totempole-code/`), which is where `.specify/` already lives. There is no backend, no API package, and no shared library, so the Option 1 single-project layout applies with a frontend-shaped `src/` tree. Tests are colocated with the modules they cover (`*.test.ts[x]` beside the source) rather than gathered into a top-level `tests/` directory — this keeps each tab and hook a self-contained, individually removable unit as Constitution Principle IX requires. The sole exception is the browser-mode layout test, which lives beside `App.tsx` because it asserts on the composed shell rather than on any one module.

## Complexity Tracking

No Constitution Check violations — table omitted.
