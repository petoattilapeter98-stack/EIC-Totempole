# Phase 0 Research: Restaurant Map

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-08

Nine questions had to be answered before the design could be written. Four of them (R2, R3, R4, R7)
are cases where the obvious implementation silently fails a requirement — those are the ones worth
reading closely.

---

## R1 — Keyless Google My Maps embed and initial framing

**Decision**: Embed the feature's My Maps map as
`https://www.google.com/maps/d/embed?mid=<MAP_ID>`, with framing supplied by the map's own saved
default view rather than by URL parameters.

**Rationale**: The `maps/d/embed` form is the "share → embed" output of Google My Maps and requires
no API key, satisfying FR-017 and Constitution VI with no proxy and no backend. It renders multiple
custom pins with names — which the keyed Maps Embed API would also do, but at the cost of a
credential, and which the plain `maps?q=&output=embed` form would *not* do (it takes a single query,
not a curated multi-pin set).

The `mid` is a public map identifier, not a secret: anyone with the embed URL can view the map. That
is the intended posture — the map contains only the addresses of public restaurants.

**Framing** (FR-007, FR-027) is set by saving the desired default view on the My Maps map itself.
The embed honours it on load. This matters because the default state and the expanded state have
different aspect ratios, so the saved view must be chosen to keep all pins inside the *narrower* of
the two boxes; the wider box then shows strictly more. Verifying framing is therefore a visual check
in both states, not an assertion a unit test can make.

**Alternatives considered**:
- *Google Maps Embed API with a proxied key*: full programmatic control over pins and framing, but
  introduces a backend service to hold the key — rejected by the spec's clarification (Q1) precisely
  because it would end the static-only deployment.
- *`maps?q=…&output=embed`*: keyless, but supports one location, not a curated set of eight.
- *Leaflet + OpenStreetMap tiles*: keyless with full in-repo control and a single source of truth,
  rejected at clarification because the request specified Google Maps.

**Consequence carried into design**: pins live in Google, the fallback list lives in the repo, and
nothing at runtime can reconcile them. See R8.

---

## R2 — Preventing the embed from navigating the kiosk away

**Decision**: Render the iframe with `sandbox="allow-scripts allow-same-origin"` and
`referrerpolicy="no-referrer-when-downgrade"`.

**Rationale**: FR-008 is not a styling concern — it is the difference between a working kiosk and a
public display stuck on a Google sign-in page with no keyboard and nobody to recover it. My Maps
embeds contain links ("View larger map", pin "Directions") that open new tabs.

Omitting `allow-popups` blocks `window.open` and `target="_blank"`; omitting `allow-top-navigation`
blocks the frame from navigating the top-level page. Both are *absent by default* in a `sandbox`
attribute — the security comes from what is not listed.

`allow-scripts` is required for the map to function at all. `allow-same-origin` is required for the
embed to reach its own cookies and storage; because the frame is cross-origin, granting it does not
give the frame access to *our* origin. The well-known danger of combining `allow-scripts` with
`allow-same-origin` applies when the framed document is same-origin with the embedder — it can then
remove its own sandbox. That is not the case here.

**Alternatives considered**:
- *No sandbox, intercept clicks in the parent*: impossible. The parent cannot observe or cancel
  events inside a cross-origin frame.
- *`sandbox="allow-scripts"` alone (no `allow-same-origin`)*: strictest, but Google Maps
  functionality degrades or fails without access to its own storage.
- *CSP `frame-src` / `navigate-to`*: complements but does not replace the sandbox, and `navigate-to`
  has poor support.

**Verification**: SC-006 is a manual check — attempt every affordance in the embed in both display
states and confirm no new tab, no top-level navigation. This cannot be asserted from inside the test
runner, so it belongs in [quickstart.md](quickstart.md), not a unit test.

---

## R3 — The idle timer is blind to interaction inside the map

**Decision**: Bridge iframe interaction to the idle timer with focus-transfer detection, bounded by
a hard `MAX_MAP_SESSION_SECONDS` ceiling (600s).

**Rationale**: This is the most consequential finding of Phase 0. `useIdleReset` registers
`pointerdown` and `keydown` on `document`. Events inside a cross-origin iframe **never reach the
parent document** — they are delivered to the frame's own document. So with a naive implementation:

> A visitor opens the map, pans and zooms it for 60 seconds without touching anything outside the
> frame, and the kiosk resets to Board Agenda underneath them.

That is FR-012 failing, and it fails *silently* — it would pass every jsdom test, because jsdom has
no real iframe focus model.

The reliable cross-origin signal is **focus**: when a user touches inside an iframe, the browser
moves focus to the iframe element, the parent window fires `blur`, and `document.activeElement`
becomes that iframe. Polling `document.activeElement === iframeEl` at ~1s therefore detects "the
visitor is working in the map" without needing any access to the frame's contents.

**The trap, and why the ceiling exists**: focus does *not* reliably clear when the visitor walks
away. Left uncapped, "iframe is focused" would count as activity forever, and the kiosk would never
idle-reset — a Principle V failure that only becomes visible after days, which is exactly the class
of bug the constitution's unattended-reliability principle exists to prevent. The ceiling makes the
failure mode bounded: map interaction can extend the session up to 10 minutes, after which idle
reset proceeds regardless of focus.

**Mechanism**: while the map tab is mounted, a single `setInterval` checks focus; on a focused tick
it calls the existing public `reset()` path exposed through `useKiosk`, so the map never manipulates
the idle hook's internals (Principle IX). The interval is created on mount and cleared on unmount.

**Alternatives considered**:
- *Transparent overlay over the map to capture the first touch*: it would have to swallow the touch
  to see it, which breaks the pan/zoom it exists to protect.
- *`postMessage` from the frame*: requires cooperation from Google's embed. Not available.
- *Treat the map tab as permanently active*: defeats idle reset entirely; the next visitor inherits
  the previous one's screen.
- *Accept the reset mid-pan*: rejected — it is a visible, repeatable failure in the feature's
  primary interaction.

**Verification**: unit-testable via a faked `document.activeElement` and fake timers — assert that
focus extends the session, that the ceiling ends it, and that unmount clears the interval.

---

## R4 — Detecting that the map failed to load, within 5 seconds

**Decision**: Race a 5s timer against the iframe's `load` event, and additionally treat
`navigator.onLine === false` as an immediate failure. Show the fallback if the timer wins.

**Rationale**: FR-013 requires the fallback within 5s. A cross-origin iframe gives almost no
introspection: `onerror` is unreliable for frames, and the parent cannot read the frame's document
or HTTP status. What *is* observable is whether `load` fired at all, and when.

The timer race covers the realistic failure modes — network down, DNS blocked, provider unreachable,
hung request — because none of them fire `load` promptly.

**The honest limitation**: if Google responds *successfully* with its own error page (rate limited,
map deleted, sharing revoked), `load` fires and we will believe the map is fine. We cannot see
inside the frame to know otherwise. This is a real, unfixable-from-the-client gap; the plan records
it rather than pretending the detection is complete. `navigator.onLine === false` is a fast path
that skips the wait when the kiosk is definitively offline, but it must not be trusted in the
positive direction — `true` only means "an interface is up", not "Google is reachable".

**Recovery** (FR-015) needs no machinery: the tab unmounts when the visitor leaves and remounts on
re-entry, so every visit is a fresh attempt. See R6.

**Alternatives considered**:
- *`fetch()` the embed URL to probe reachability*: blocked by CORS, and it would double the network
  cost of every map view.
- *Longer timeout with a spinner*: violates FR-013's 5s bound and leaves the kiosk showing a spinner
  to a lobby.
- *Retry loop inside the view*: rejected under Principle V — a retry timer on an unattended display
  is an unbounded background process for no user benefit, since re-entry already retries.

---

## R5 — A full-viewport expanded state that is not a modal

**Decision**: The expanded state is a `position: fixed; inset: 0` element rendered by the tab
component itself, toggled by React state. No portal, no `<dialog>`, no `role="dialog"`.

**Rationale**: Constitution IV bans modals and popups, and the spec's Interpretation Note commits to
both display states being inline states of the same page. `position: fixed` is a paint-level
decision, not a navigation or dialog construct: the element stays in the React tree under the tab
module, nothing is portalled to `document.body`, and no dialog semantics are announced. A visitor
cannot end up "inside" something they must dismiss before the app works — the return control is
always visible (FR-025) and idle reset exits it (FR-011).

The shell's `.shell { overflow: hidden }` guarantees the fixed element cannot introduce scrolling.

**Focus management**: on expand, focus moves to the return control so a keyboard or screen-reader
user is not stranded behind the now-covered nav; on collapse, focus returns to the expand control.
This is the accessibility obligation of the state change, and it is deliberately *not* a focus trap
— a trap would make it a modal in everything but name.

**Alternatives considered**:
- *A CSS class on the shell that restyles the grid*: would require the feature to reach into
  `App.module.css`, breaking Principle IX isolation.
- *A React portal to `document.body`*: escapes the module's DOM subtree for no benefit and reads as
  a modal.
- *Native fullscreen API*: a browser-level mode change, not an inline state; unavailable to a
  sandboxed frame anyway.

---

## R6 — Resetting map state on entry and on idle

**Decision**: Hold expand state and any transient view state as local React state in the tab
component. Add nothing to `KioskContext`.

**Rationale**: This one is free, and worth stating explicitly so nobody adds machinery for it.
`ContentRegion` renders `<main key={activeTab}>`, so switching tabs **unmounts** the previous tab
rather than hiding it. `resetInteractionState` sets `activeTab` back to `DEFAULT_TAB_ID`
('board-agenda'), which unmounts the map.

Therefore both halves of FR-011 — reset on idle, and reset on fresh entry — are satisfied by
component lifecycle alone. Local state is destroyed on unmount and re-initialised on the next mount.
The map's pan/zoom position lives inside the iframe, which is likewise destroyed and re-created.

This also keeps `KioskContext`'s documented extension point unused, which is correct: that hook
exists for features holding *visitor-entered data*, and this feature holds none (FR-033).

**Alternatives considered**:
- *Register a reset callback in `KioskContext`*: unnecessary coupling; the context would gain
  knowledge of a feature it does not need.
- *Keep the tab mounted and hidden for faster re-entry*: rejected — it would preserve the previous
  visitor's pan position (violating FR-011), keep a third-party frame live indefinitely, and hold
  memory across a multi-day uptime for no benefit.

---

## R7 — The nav bar hardcodes four columns

**Decision**: Change `TabNav.module.css` from `grid-template-columns: repeat(4, 1fr)` to
`grid-auto-flow: column; grid-auto-columns: 1fr`.

**Rationale**: `registry.ts` promises that adding a tab requires one entry and "nothing else in the
codebase changes", but the nav's column count is a literal `4`. A fifth entry would either overflow
or wrap, breaking Principle II. The chosen form derives the column count from however many children
exist, so the literal disappears and the promise becomes true for every future tab as well.

At five tabs and 1920px width the arithmetic is comfortable: roughly 350px per tab after the shell's
horizontal padding and four 16px gaps — far above the 64px minimum (Principle III). Hungarian labels
are the longer set and already ellipsize via the existing `.label` rule.

**Alternatives considered**:
- *`repeat(5, 1fr)`*: fixes today, re-breaks on the sixth tab.
- *`repeat(auto-fit, minmax(…))`*: introduces wrapping behaviour, which is exactly the failure mode
  Principle II forbids.

---

## R8 — Keeping the map pins and the in-repo list in step

**Decision**: Enforce every invariant that *can* be checked in a unit test, and handle the one that
cannot with a documented editorial procedure plus a visible-by-design layout.

**Rationale**: FR-023 requires the My Maps pins and the in-repo list to name the same restaurants,
but the running application cannot read the pins out of a keyless embed — so no automated test can
prove parity. Pretending otherwise would be the wrong move; instead the design narrows the gap from
three directions:

1. **Testable invariants** on the in-repo data (R8 → `restaurants.test.ts`): at most 8 entries,
   numbers exactly `1..n` with no gaps or duplicates, unique names, every required field non-empty.
   These catch the majority of editing mistakes.
2. **Visibility by design**: because the companion list is on screen during *normal* operation (not
   only in the offline fallback), a mismatch between "list says 7 restaurants" and "map shows 6
   pins" is visible to anyone looking at the kiosk. This is a direct benefit of the Q3 clarification.
3. **A documented procedure** in `restaurants.static.ts` and quickstart: change the map and the list
   in the same commit-sized action, then eyeball both states.

**Alternatives considered**:
- *Scrape the My Maps KML (`maps/d/kml?mid=…`) at build time to generate the list*: would give true
  single-source-of-truth, but adds a network call to the build (fragile, and fails offline builds),
  depends on an undocumented endpoint, and puts a Google dependency in CI. Rejected for this
  feature; recorded here as the obvious upgrade path if drift becomes a real problem in practice.
- *Runtime comparison*: impossible — the embed is opaque.

---

## R9 — Tab identity: id, label, icon, accent

**Decision**: `id: 'restaurant-map'`, labels `{ en: 'Restaurants', hu: 'Éttermek' }`, icon
`UtensilsCrossed` (lucide-react), accent `emerald`.

**Rationale**: The `id` must equal the folder name per the `TabMeta` contract. `emerald` and `blue`
are the two unused accents in the `AccentName` union (violet, cyan, rose and amber are taken).

**Emerald is the correct choice for an accessibility reason, not an aesthetic one**: `tokens.css`
annotates `--accent-blue` as `3.27:1 — UI/large only`, while `--accent-emerald` is `4.6:1`. Only
emerald clears WCAG AA for normal-size text, and this feature puts accent colour near a list of
restaurant names. Picking blue would have quietly created a Principle VII violation.

**Icon — verify before use**: `UtensilsCrossed` is the intended choice (unambiguous at nav scale,
food-specific). `node_modules` is not installed in this working tree, so its presence in the pinned
lucide-react `^0.468.0` was **not** confirmed. Check at implementation time; if absent, `Utensils`
or `MapPin` are acceptable substitutes. Either way no new dependency is added.

Labels favour the short, scannable noun over a literal "Restaurant Map" so the nav label does not
ellipsize in Hungarian, where the compound ("Étteremtérkép") is markedly longer.

---

## R10 — Fallback layout in both display states

**Decision**: The fallback replaces only the map box, keeping the companion list in place in the
default state; in the expanded state it renders as a centred list on the full viewport.

**Rationale**: FR-013 requires names and addresses; the companion list already supplies names, so
the fallback adds addresses and the explanatory message. Reusing the same `RestaurantList` component
in both roles means the fallback cannot disagree with the normal view about which restaurants exist
— they render from the same array.

The expanded-state case matters because a visitor can expand the map *before* the load race
resolves; the fallback must therefore be laid out for a full-viewport box too, not only the content
region (spec edge case).

**Alternatives considered**:
- *Collapse to the default state automatically on failure*: a surprise state change the visitor did
  not ask for; rejected.
- *A separate fallback-only component*: duplicates the list rendering, re-creating exactly the
  two-sources-that-can-disagree problem FR-023 already forces us to manage once.
