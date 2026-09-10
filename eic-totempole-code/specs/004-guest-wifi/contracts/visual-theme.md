# Contract: Panel Glow Treatment

**Feature**: `004-guest-wifi` | **Consumers**: `GuestWifi.tsx`, `GuestWifi.module.css`

The visual contract for FR-009/FR-010/FR-012 and the clarifications from 2026-09-10, including two
post-implementation revisions:

1. Replaced the panel's original dark background with the same light surface every other tab uses.
2. Moved the glow from a small halo confined to the QR plate to an ambient wash across the whole
   panel — user feedback that the QR-scoped version "doesn't really fit into the page" and should
   "affect the whole panel" instead.

Colours here are scoped to this feature's own CSS module (research R5) — nothing in `tokens.css`
changes.

---

## 1. Colour tokens

No new tokens are defined. The panel reuses the exact tokens every other tab already uses,
inherited from the shared `.content` card in `App.module.css` (`--color-surface` background,
`--color-border-soft` border, `--shadow-surface`):

| Element | Token | Role |
|---|---|---|
| Panel background | `--color-surface` (inherited, not set locally) | Same white card every tab renders into |
| Heading / instruction / values | `--color-text` | Primary text |
| Labels / fallback body | `--color-text-muted` | Secondary text |
| Credential row fill | `--color-surface-sunken` | Matches `restaurant-map`'s `.row` convention |
| Credential row / QR plate border | `--color-border-soft` | Matches `restaurant-map`'s card convention |
| Panel glow (whole-panel wash) | `var(--brand-blue)`, `var(--brand-orange)` | Decorative only |
| QR plate background | `#FFFFFF` (fixed, inline SVG attribute) | **Never themed** |
| QR plate modules | `#000000` (fixed, inline SVG attribute) | **Never themed** |

### Contrast obligations (Constitution VII)

Every text pair here is a pair `tokens.css` already documents for the shared white surface,
reused as-is — no new colour math to review:

| Pair | Ratio | Verdict |
|---|---|---|
| `--color-text` on `--color-surface` | 17.85:1 | PASS AAA (documented in `tokens.css`) |
| `--color-text-muted` on `--color-surface` | 5.1:1 | PASS AA (documented in `tokens.css`) |
| QR module `#000000` on plate `#FFFFFF` | 21:1 | PASS AAA — the maximum possible ratio, required for scan reliability independent of accessibility |

The glow wash carries **no contrast obligation** on its own: it sits behind real text at
`z-index: 0` (`pointer-events: none`) while every text element gets `position: relative; z-index:
1`, so it never overlaps a glyph at full document flow — the same posture `AmbientAurora`'s blobs
take ("Contrast rules do not apply here... never a surface for text"). Its opacity is kept low
enough (§4) that it would not meaningfully change the contrast ratios in the table above even
where it does show through behind translucent surfaces like `--color-surface-sunken`.

## 2. QR plate structure

The plate itself is unaffected by either revision — it was never dark-background- or
glow-position-specific:

```
┌─────────────────────────────┐  ← #FFFFFF background,
│  ░░░░  quiet zone (4 mods) ░░│    sized to matrix + 8 modules
│  ░░ ┌───────────────────┐ ░░│    (4 per side)
│  ░░ │   QR modules      │ ░░│
│  ░░ │  #000000           │ ░░│
│  ░░ └───────────────────┘ ░░│
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────┘
```

Built from `uqr`'s `encode()` boolean matrix (research R1) as an inline `<svg>`:
- A single background `<rect>` filled `#FFFFFF`, and one batched `<path>` for all dark modules,
  filled `#000000` — both fixed inline SVG attributes, never CSS classes, so no theme rule
  (present or future) can retint them (Clarifications 2026-09-10 Q1).
- `aria-hidden="true"` on the `<svg>` — the adjacent printed SSID/password text (Story 2) already
  carries the equivalent information for assistive tech.
- The plate additionally gets a `1px solid var(--color-border-soft)` border and
  `box-shadow: var(--shadow-raised)` so it reads as a distinct card against the (now also white)
  panel background — this border did not exist in the dark-background version, where the plate's
  own white fill already contrasted with the navy behind it.

## 3. Panel background

The panel sets **no background of its own** — it inherits the white `--color-surface` card the
shared `ContentRegion` → `App.module.css` `.content` wrapper already paints behind every tab
(spec FR-009, post-implementation revision). This is a smaller footprint than the original
dark-background design: no local `--gw-bg`/`--gw-text` custom properties are needed at all,
since every text element uses the same tokens `board-agenda`/`restaurant-map` already use.

## 4. Glow/pulse animation

**Scope (2026-09-10, second post-implementation revision)**: the glow is two blobs on `.root`
itself — `.root::before` (top-left, blue-leading) and `.root::after` (bottom-right, orange
counterpoint) — each covering roughly half the panel's height via `inset`, so together they wash
across the entire panel rather than forming a halo around any one element. This directly mirrors
`AmbientAurora`'s own blue-leads/orange-counterpoint structure and multi-blob technique, scoped
down from the full 3840x2560 shell to one panel's bounds. The QR plate no longer has its own
`::before`/`::after` — that wrapping `.qrFrame` element was removed entirely along with it.

- Animates only `opacity` and `transform` (compositor-only — matches `AmbientAurora`'s documented
  reasoning about a ~10-megapixel panel running for days).
- Runs continuously while the tab is mounted (FR-009) — no `animation-play-state` toggle is needed
  for the *active* state, since CSS animations simply stop existing when the element unmounts
  (research R4).
- **Opacity kept low — `0.16`–`0.26`**: lower than even the QR-scoped version's already-reduced
  range. A wash covering the whole panel sits directly behind body text (headings, credential
  values), not just empty space beside a plate — bold colour here would compete with the text for
  attention rather than reading as ambience. Tuned by eye against the rendered panel, in both the
  configured and not-configured (fallback) states.
- Two independent keyframes (`gw-drift-a`, `gw-drift-b`) rather than one shared one, each on its
  own `--motion-pulse` / `--motion-float` duration — matching `AmbientAurora`'s reasoning that
  independent, non-matching durations keep the motion from ever visibly resynchronising into a
  static-feeling loop.
- `@media (prefers-reduced-motion: reduce)`: `animation: none` on both blobs, falling back to a
  static `0.18` opacity — the wash stays visible, only movement is removed (research R4, matching
  `AmbientAurora`'s existing reduced-motion rule).

**Stacking**: because `.root::before`/`::after` are `position: absolute` with `z-index: 0`, and
every real content element (`.heading`, `.body`, `.fallback`) is explicitly `position: relative;
z-index: 1`, the wash paints behind all real content. This is a correctness detail worth stating
explicitly: an absolutely-positioned pseudo-element paints *above* static in-flow siblings by
default regardless of DOM order, so omitting the `z-index: 1` on any future content element added
to `.root` would silently put the glow on top of it.

## 5. Attract-mode interaction (FR-010, Clarifications 2026-09-10)

No special-case code. The shell's existing `.attract .recede { opacity: 0.16 }` rule
(`App.module.css`) already applies to `ContentRegion`'s className, which wraps whatever this tab
renders — so the whole panel, including the glow layer, dims to 16% opacity after the standard
idle period exactly like every other tab. Because the glow keeps animating underneath (per
FR-010, "MAY continue running"), no `animation-play-state` change is tied to `isAttract` either —
the CSS animation research R4 already established needs no JS involvement, and dimming is purely
a parent-level `opacity`, which composites independently of the child's own animation.
