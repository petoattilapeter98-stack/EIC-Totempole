# Contract: Shell UI Structure, Layout & Accessibility

**Feature**: `001-lobby-kiosk-shell` | **Consumers**: all shell components, the browser-mode layout test

The DOM, layout and accessibility contract for the app shell. This is the contract that makes Constitution Principles II (no scroll), III (touch targets) and VII (accessibility) verifiable rather than aspirational.

---

## 1. Layout contract

```text
html, body            overflow: hidden; height: 100%
└── #root
    └── .shell        height: 100dvh (100vh fallback); display: grid;
                      grid-template-rows: auto auto auto 1fr;
                      overflow: hidden
        ├── <header>  HeaderBar    → row 1 (auto)
        ├── <section> HeroBanner   → row 2 (auto)
        ├── <nav>     TabNav       → row 3 (auto)
        ├── <main>    ContentRegion→ row 4 (1fr)  ← min-height: 0  (REQUIRED)
        └── <footer>  FooterBar    → inside row 4's grid or as a 5th auto row
```

**Hard rules**

| Rule | Why |
|---|---|
| `grid-template-rows: auto auto auto 1fr` on a `100dvh` container | The content region absorbs remaining height by construction (spec FR-016) |
| The `1fr` row MUST set `min-height: 0` | Grid items default to `min-height: auto` and refuse to shrink below intrinsic content size — **the single most common cause of a `1fr` row overflowing** (research R7) |
| `overflow: hidden` on `html`, `body` and `.shell` | Makes page scroll structurally impossible, not merely unlikely (spec FR-020) |
| No fixed pixel heights on rows 1–3 | Content-driven `auto` rows keep the layout honest when copy length changes with the HU translation |
| Any future inner scroll lives **inside** the content region | Never the page (spec FR-016) |

**Footer placement note**: the footer's countdown must remain visible at all times (spec FR-017). Implement it as a fifth `auto` grid row (`auto auto auto 1fr auto`) so it can never be pushed off-screen by content — simpler and safer than nesting it inside the content row.

---

## 2. Touch target contract

Every interactive element (the four nav tabs and the language toggle — the only ones in this feature):

| Property | Value | Token |
|---|---|---|
| Min hit area | 64 × 64 px | `--touch-target-min: 4rem` |
| Min gap to adjacent target | 16 px | `--touch-gap-min: 1rem` |

The target is the **element's own box including padding**, not the icon glyph. Achieve it with `min-block-size` / `min-inline-size` plus padding, never with a transparent overlay. Spec FR-021, Constitution III, SC-008.

---

## 3. Accessibility contract

| Element | Requirement |
|---|---|
| Nav container | `<nav>` wrapping `role="tablist"` with `aria-label` |
| Each tab | Real `<button type="button">` with `role="tab"`, `aria-selected`, `aria-controls` pointing at the panel, `id` referenced by the panel's `aria-labelledby` |
| Tab keyboard support | `ArrowLeft` / `ArrowRight` move between tabs, `Home` / `End` jump to first / last; roving `tabIndex` (active tab `0`, others `-1`) per the WAI-ARIA tabs pattern |
| Content region | `<main>` with `role="tabpanel"`, `aria-labelledby` referencing the active tab, `tabIndex={0}` |
| Language toggle | `<button>` with `aria-label` from `strings.languageToggleAria`; announces the language it switches **to** |
| Live status dot | `aria-hidden="true"` — decorative; the "system live" meaning is not conveyed by the dot alone |
| Hero graphic | `aria-hidden="true"` — decorative (spec FR-010) |
| Clock | `<time dateTime={iso}>` so the machine-readable value is exposed |
| Idle countdown | **`aria-live="off"`** — a per-second live region would make a screen reader announce a number every second, rendering the kiosk unusable |
| Colour | Never the sole carrier of meaning: the active tab is a filled dark surface **and** `aria-selected` (research R10) |
| Contrast | All text ≥ AA. Base `#011C31` (brand navy) on `#E7EEF4` ≈ 14.8:1, on `#FFFFFF` ≈ 17.85:1. Accents used for text must be the ≥600 shade and individually verified — see `src/styles/tokens.css` for the full measured table |

Constitution VII requires keyboard reachability **even though input is touch-only** — this costs almost nothing here because the WAI-ARIA tabs pattern is the same code that makes the nav semantically correct for screen readers.

---

## 4. Token contract

`src/styles/tokens.css` is the **single** source of design values, exposed as custom properties on `:root`. Components consume tokens; components never hard-code a hex value or a raw px size.

| Group | Tokens |
|---|---|
| Surface | `--color-bg: #E7EEF4` (navy-tinted, not neutral slate — see brand palette amendment below), `--color-surface: #FFFFFF`, `--shadow-surface` (soft, layered) |
| Text / active | `--color-text: var(--brand-navy)` (`#011C31`), `--color-text-muted`, `--color-active-bg: var(--brand-navy)`, `--color-active-fg: #FFFFFF` |
| Accents (category identity only) | `--accent-emerald`, `--accent-blue`, `--accent-violet`, `--accent-amber`, `--accent-cyan`, `--accent-rose` (+ matching `-soft` fills) — see §4a for the brand-derived values |
| Type | `--font-display: 'Space Grotesk'`, `--font-body: 'Plus Jakarta Sans'`, `--text-xs … --text-6xl` (rem) |
| Space | `--space-1 … --space-16` (rem) |
| Radius | `--radius-md`, `--radius-xl`, `--radius-2xl`, `--radius-pill` |
| Touch | `--touch-target-min: 4rem`, `--touch-gap-min: 1rem` |
| Motion | `--motion-pulse`, `--motion-float`, `--ease-out-expo` |

Accents are for **category identity only** — tab icons, the event pill, per-tab highlights. Body copy is always `--color-text` (research R10).

### 4a. Brand palette amendment (2026-09-06)

The surface/text/accent values above were revised after the original P1 build to apply the TEKsystems brand (orange `#FE9225`, blue `#0098D1`, navy `#011C31`; source: brandcolorcode.com/teksystems), post-dating this contract's original authoring. This is a **documentation catch-up, not a new decision to make** — the change already shipped in `src/styles/tokens.css`, which remains the source of truth for exact values and measured contrast ratios.

- The six accent names (`AccentName` in [contracts/tab-module.md](./tab-module.md)) are unchanged, but no longer resolve to six independent colors. They now derive from two brand hues: `--accent-violet`/`--accent-amber` map to darkened navy/orange "ink" derivations (`--brand-blue-ink`, `--brand-orange-ink`), `--accent-blue`/`--accent-cyan`/`--accent-emerald` are blue-family steps, `--accent-rose` is an orange-family step. Blue carries category identity; orange carries state (see `--color-status-live: var(--brand-orange)`).
- Raw `--brand-orange` (`#FE9225`) is deliberately never used as text/icon foreground on the light UI — it measures 2.25:1 on white, failing even the 3:1 large-text/icon threshold. It appears only on the navy ground (7.72:1) or as a fill behind navy text.
- The page ground (`--color-bg`) moved from a neutral `#F8FAFC` to a navy-tinted `#E7EEF4` specifically so the brand stays present, and so white cards read as panels lifting off a tinted ground rather than dissolving into a near-white field under lobby lighting.

Data-model.md §3's tab/accent table (id, icon, EN/HU label per tab) is still accurate — only the color *values* behind the accent names changed, not which tab uses which name.

---

## 5. Layout test contract

`src/app/App.layout.browser.test.tsx`, run by the browser-mode Vitest project at viewport **1920×1280** (research R6):

1. Render `<App />`. Assert `documentElement.scrollHeight <= documentElement.clientHeight`.
2. Assert `documentElement.scrollWidth <= documentElement.clientWidth`.
3. **Repeat 1–2 for each of the four tabs**, clicking through the nav — a tab whose placeholder overflows must fail (spec FR-020, SC-004).
4. Assert every element with `role="tab"` and the language toggle each report a bounding box ≥ 64 × 64 px (spec FR-021, SC-008).
5. Assert the gap between adjacent tab bounding boxes is ≥ 16 px.

Assertions 4 and 5 are only meaningful in a real layout engine — in jsdom every rect is zero and they would pass vacuously. That is precisely why this project exists.
