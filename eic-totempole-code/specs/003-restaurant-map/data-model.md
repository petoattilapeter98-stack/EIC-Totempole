# Phase 1 Data Model: Restaurant Map

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-08

The feature has no database, no API, and no persisted state. "Data model" here means two things: the
shape of the hand-authored curated set, and the view state the component holds while mounted.

---

## 1. `RestaurantPlace`

One curated dining location. Hand-authored in `src/tabs/restaurant-map/restaurants.static.ts`.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `number` | `number` | yes | 1-based position. Must match the pin number on the My Maps map (FR-006). Across the set, numbers form exactly `1..n` — no gaps, no duplicates. |
| `name` | `string` | yes | Proper noun, rendered as authored in both locales (FR-018). Non-empty, unique within the set. |
| `address` | `LocalizedText` | yes | Street address shown in the offline fallback (FR-013). Localized because street-type words differ (`Váci Street` / `Váci utca`), while the proper-noun part does not. |
| `walkMinutes` | `number` | **yes** | Editorial estimate of walking time from the building, shown on every companion-list row (FR-006, FR-038). Positive integer. Not computed from live routing data (Out of Scope). |
| `cuisine` | `LocalizedText \| undefined` | no | Short descriptor, e.g. `{ en: 'Hungarian', hu: 'Magyar' }`. Not shown in the companion list — rows are single-line (FR-038). |

**Type note**: `cuisine` must be declared as `?: LocalizedText | undefined` — the project enables
`exactOptionalPropertyTypes`, so `?: T` alone rejects an explicit `undefined`. `walkMinutes` is
required and takes no such modifier.

### Validation rules (enforced in `restaurants.test.ts`)

These are the invariants a test *can* prove. They are the first line of defence for FR-023, whose
full guarantee is not machine-checkable (research R8).

| ID | Rule | Requirement |
|----|------|-------------|
| V1 | `RESTAURANTS.length >= 1 && <= 8` | FR-031, FR-005 |
| V2 | `number` values sorted are exactly `[1, 2, …, n]` | FR-006 |
| V3 | `name` values are unique and non-empty after trim | FR-005 |
| V4 | Every `address.en` and `address.hu` is non-empty after trim | FR-013 |
| V5 | Where present, `cuisine` has both locales non-empty | FR-018 |
| V6 | `walkMinutes` is present on every entry and is a positive integer | FR-006, FR-038 |
| V7 | The exported array is frozen (`as const`) so no runtime mutation can grow it | Principle V |

**Not checkable, by design**: that these entries correspond to the pins on the My Maps map. Nothing
in the running app can read those pins. See the editorial procedure in
[contracts/curated-data.md](contracts/curated-data.md).

---

## 2. `CuratedRestaurantSet`

The exported constant: `readonly RestaurantPlace[]`, ordered by `number`.

It is the single in-repo source for **both** on-screen roles — the companion list in normal
operation and the fallback list when the map fails. Those two renderings therefore cannot disagree
with each other (they share one array); the only possible disagreement is with the Google-side pins,
which is what FR-023 governs.

**Cap rationale**: the 8-entry limit (FR-031) is a layout guarantee, not a preference. The layout
test renders the set padded to 8 with worst-case-length Hungarian names to prove no-scroll holds at
the boundary.

---

## 3. View state (transient, in-memory, per mount)

Held as local React state inside `RestaurantMap.tsx`. None of it survives unmount — which is exactly
how FR-011 is satisfied (research R6).

| State | Type | Initial | Transitions |
|-------|------|---------|-------------|
| `display` | `'default' \| 'expanded'` | `'default'` | `'default' → 'expanded'` on expand control; `'expanded' → 'default'` on return control. Idle reset unmounts the whole tab, so no explicit reset transition exists. |
| `mapStatus` | `'loading' \| 'ready' \| 'failed'` | `'loading'` (or `'failed'` immediately if `navigator.onLine === false`) | `'loading' → 'ready'` on iframe `load`; `'loading' → 'failed'` when the 5s timer wins the race. Terminal — no transition out of `'ready'` or `'failed'` within one mount. |

### State diagram

```text
mount ──> display: default ────expand────> display: expanded
                  ^                              │
                  └──────────return──────────────┘

mount ──> mapStatus: loading ──iframe load──> ready
                    │
                    └──5s elapsed / offline──> failed
```

`display` and `mapStatus` are independent: all six combinations are reachable and must render
correctly. The two that are easy to forget are `expanded + loading` and `expanded + failed` — a
visitor can expand the map before the race resolves, so the loading and fallback layouts both need a
full-viewport form (research R10).

**Why `mapStatus` is terminal within a mount**: retrying inside a live view would mean a background
retry timer on an unattended display (Principle V). Recovery instead happens on the next mount,
which is a fresh load attempt — FR-015 without any added machinery.

---

## 4. Derived / constant values

| Name | Value | Source |
|------|-------|--------|
| `MAP_LOAD_TIMEOUT_MS` | `5000` | FR-013, SC-005 |
| `MAX_MAP_SESSION_SECONDS` | `600` | Principle V ceiling on focus-driven activity (research R3) |
| `MAP_FOCUS_POLL_MS` | `1000` | Focus-transfer poll interval (research R3) |
| `MAP_EMBED_URL` | `https://www.google.com/maps/d/embed?mid=<MAP_ID>` | FR-004, research R1 |
| `MAX_RESTAURANTS` | `8` | FR-031 |

`MAX_MAP_SESSION_SECONDS` is now backed by **FR-036** rather than being a plan-invented constant;
the spec sets the ceiling at 10 minutes, which matches `600`.

`MAP_EMBED_URL` contains a public map identifier, not a credential (research R1). It is a plain
module constant, deliberately **not** an environment variable — routing it through `import.meta.env`
would suggest it is secret and invite someone to treat the pattern as key-safe later.
