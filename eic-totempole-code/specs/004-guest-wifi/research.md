# Phase 0 Research: Guest Wi-Fi Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-10

Eight questions had to be answered before the design could be written. R2 and R3 are the ones
where the obvious approach would have silently broken QR scannability or Constitution II — those
are worth reading closely.

---

## R1 — Generating the QR code without a backend or a network call

**Decision**: Add `uqr` (MIT, zero runtime dependencies, tree-shakable, ships TypeScript types) as
a new production dependency. Use its `encode()` function to turn the Wi-Fi payload string (R2) into
a boolean module matrix at build/render time, entirely in the browser, then render that matrix as
our own inline SVG (R3) rather than using the package's bundled `renderSVG` helper.

**Rationale**: A QR code is a Reed–Solomon-encoded matrix; hand-rolling that algorithm is hundreds
of lines of error-correction math that has already been solved correctly and is not worth
re-deriving for one feature. `uqr` was chosen over the alternatives below because it has zero
dependencies of its own (nothing transitively enters the bundle), exposes the raw matrix rather
than only a rendered output (needed for R3's light-QR-on-dark-panel requirement), and is
TypeScript-native (no separate `@types` package, matching how the rest of the kiosk is strict-mode
TS).

This does not conflict with Constitution VIII (Static-First Delivery). That principle's rationale
is about avoiding *dynamic backend dependencies* — a request-time server, a live third-party
fetch, a credential — each of which is "an additional runtime failure mode on a device nobody is
watching." Encoding a QR matrix from already-bundled static data, synchronously, with zero network
calls, has none of those properties; it is the same category of "computation" as every other piece
of this React app rendering from its props. (Contrast with 003-restaurant-map's Google Maps embed,
which *is* a live third-party dependency and was recorded as a justified deviation — this feature
has no equivalent dependency, so no Complexity Tracking entry is needed here.)

**Alternatives considered**:
- `qrcode` (npm): the most widely used option, but only outputs to canvas/data-URL/string forms —
  getting an SVG with per-module control over colour would mean parsing its output back apart.
- `qrcode-generator` (kazuhikoarase): also zero-dependency and exposes an `isDark(row, col)`
  matrix API, functionally similar to `uqr`. Rejected only because it ships as plain JS with
  community `@types`, not first-party TypeScript.
- A public QR-image API (e.g. `api.qrserver.com`): rejected outright — it would send the guest
  network's SSID and password to a third-party service over the network on every render, is a
  runtime dependency with no offline fallback, and contradicts Constitution VI's "treat the client
  as untrusted, don't hand third parties more than necessary" posture even though the password
  itself is meant to be publicly visible on-screen.
- Pre-generating a static SVG/PNG asset at build time from the config: rejected as needless
  process — it would require a build step (or a manual regeneration step) kept in sync with
  `wifiConfig.static.ts` by hand, trading a five-line pure function for an editorial procedure with
  a drift risk, for no benefit over computing it directly in the one component that needs it.

**Version note**: pin the exact current `uqr` version at implementation time (`npm view uqr
version`) rather than trusting a version number recorded during planning — the same caution
003-restaurant-map applied to confirming `lucide-react` icon availability before use.

**Confirmed at implementation time (T001)**: `uqr@0.1.3` installed, zero runtime dependencies
(`package.json` `dependencies: {}`), ships its own `.d.ts`. `encode(data, options)` returns
`{ version, size, maskPattern, data: boolean[][], types }` where `data[row][col] === true` means a
dark module — matches this document's assumption exactly. The `options.border` default (`1`) is
overridden to `0` in `qr.ts` so the returned matrix carries no built-in quiet zone; the 4-module
quiet zone from contracts/visual-theme.md §2 is added explicitly when building the SVG, keeping
that margin a property of our own rendering rather than a library default someone could change
later without noticing the contract it would break. `options.ecc` is set to `'M'` (15% recovery)
rather than the default `'L'` (7%) — a screen-scanned code (glare, viewing angle, a phone held at
arm's length) benefits from the extra error-correction headroom more than it needs the slightly
smaller matrix `'L'` would produce.

---

## R2 — The Wi-Fi QR payload format and escaping

**Decision**: Encode `WIFI:T:<type>;S:<ssid>;P:<password>;;` (omit `H:` entirely — hidden networks
are out of scope, see Assumptions), escaping any of `\ ; , " :` inside `ssid` and `password` with a
backslash, per the de-facto format that iOS and Android camera apps both recognize (originated by
the ZXing project, now the common convention every scanner implements).

**Rationale**: This is not an official IETF/IEEE standard — it is a convention — but it is the
convention every mainstream phone camera actually implements, which is what FR-002 depends on.
Getting the escaping wrong is a silent, high-impact bug: a password containing `;` or `"` (both
legal WPA2 passphrase characters) would produce a QR code that scans successfully but joins the
network with a *truncated or wrong* password, failing exactly the scenario Story 1 exists for —
and it would look correct in every visual/layout check, since the QR code still renders fine.

**Escaping rule**: prefix each of `\`, `;`, `,`, `"`, `:` with a single `\` before insertion, in a
single left-to-right pass with the backslash itself escaped first (so an already-escaped sequence
is never double-escaped). This is implemented as one pure function, unit-tested directly against
known input/output pairs — not against the QR library, which is trusted to encode whatever string
it is given.

**Alternatives considered**:
- *No escaping, assume operators pick "simple" passwords*: rejected — it is exactly the kind of
  silent failure mode that only surfaces when a real network's password happens to contain a
  semicolon, at which point it fails in production with no error message anywhere.
- *URL-encode the whole payload*: not what scanners expect; the `WIFI:` scheme uses its own
  backslash-escaping convention, not percent-encoding.

---

## R3 — Rendering the matrix as SVG so the QR code itself stays scannable inside a dark, glowing panel

**Decision**: Render the encoded matrix as a small inline `<svg>` built from the boolean matrix
directly (one `<rect>` per dark module, or an equivalent `<path>` batching them), with a solid
light background rect sized to include the QR standard's mandatory quiet zone (4 modules on every
side), keeping that background rect's colour fixed regardless of the panel's dark theme or attract
state. The glow/pulse effect (FR-009) is a separate CSS `box-shadow`/gradient layer positioned
*behind and around* this light plate — a frame, never a filter or blend mode applied to the plate
or its modules.

**Rationale**: This is the direct implementation of the Q1 clarification (2026-09-10): the QR
code's own colours must never change, because camera scanners are tuned for a light-background,
dark-module image with adequate quiet zone, and low-contrast or tinted modules measurably reduce
scan reliability on exactly the hardware (a phone camera at arm's length) this feature depends on.
Rendering our own SVG from the raw matrix (rather than using a packaged renderer) is what makes
this guarantee enforceable in code and in a unit test (assert the plate's fill is the fixed light
token, never a themed one) rather than only in a style-guide comment.

**Alternatives considered**:
- *Let the QR sit directly on the dark background, no light plate*: fails the quiet-zone
  requirement — QR decoders expect a light margin around the code, not a dark one, and reliability
  drops sharply without it.
- *Style the QR's dark modules using the panel's accent colour*: this is exactly what the
  clarification rejected — module-colour tinting is a known scan-reliability risk, and the panel
  already gets its "glowing" identity from the aura around the plate, not from the code itself.
- *Use `uqr`'s bundled `renderSVG` output unmodified*: would render the whole thing (quiet zone
  included) as one opaque SVG string, which is harder to guarantee "never recoloured" against
  since nothing stops a future change from applying a CSS filter to the whole embedded SVG.
  Building our own minimal SVG keeps the light plate as a plain, unstyleable-by-accident element.

---

## R4 — The glow/pulse animation needs no JavaScript timer

**Decision**: Implement the continuous glow entirely as CSS `@keyframes` animating only `opacity`
and `transform` (never `filter: blur()` at full-panel scale, for the same compositor-cost reason
AmbientAurora avoids it), scoped to this tab's own CSS module. No `setInterval`/`setTimeout` is
created for the glow itself.

**Rationale**: `ContentRegion` unmounts the previous tab's component whenever `activeTab` changes
(`<main key={activeTab}>`), and CSS animations stop and are garbage-collected automatically on
unmount — there is nothing to clear. This mirrors 003-restaurant-map's R6 finding ("reset on entry
and on idle is already free") for the same structural reason, and satisfies FR-013's multi-day
reliability requirement with zero added timers, not merely a well-behaved one.

**Reduced motion**: per Constitution VII (accessibility baseline) and the existing
`AmbientAurora.module.css` precedent, wrap the animation in
`@media (prefers-reduced-motion: reduce)` and fall back to a static (non-animating) glow — the dark
background and aura stay, satisfying FR-009's "visually distinct" intent, but nothing moves.

**Alternatives considered**:
- *A JS-driven pulse (`requestAnimationFrame` loop)*: strictly worse on every axis here — more
  code, a cleanup obligation CSS doesn't have, and no capability CSS animation lacks for this
  effect (a smooth, looping opacity/scale pulse).

---

## R5 — Theming the panel without touching shared chrome or global tokens

**Original decision (superseded — see below)**: the panel painted its own dark background and
glow entirely inside this tab's own root element and CSS module, via a small set of
locally-scoped dark-theme custom properties (`--gw-bg`, `--gw-text`, `--gw-text-soft`) inside
`GuestWifi.module.css`.

**Revised decision (2026-09-10, post-implementation)**: the panel sets **no background of its
own** at all. It inherits the same white `--color-surface` card every other tab renders into (the
shared `.content` wrapper in `App.module.css`), and every text element uses the exact tokens
`board-agenda`/`restaurant-map` already use (`--color-text`, `--color-text-muted`,
`--color-surface-sunken`, `--color-border-soft`) — no local custom properties needed at all. This
is a *smaller* footprint than the original decision, not just a different one: zero new colour
definitions anywhere, reusing exactly what already exists.

**Rationale for the revision**: after seeing the dark-background version running on the actual
kiosk shell, the dark treatment read as inconsistent with the other four tabs rather than as a
deliberate accent — feedback that only surfaces once a design is actually rendered next to its
siblings, not from the spec or a static mockup. The "visually immersive, glowing" goal from the
original request is preserved entirely by the animated halo behind the QR code (R1/R3), which
does not depend on the panel's background being dark to read as eye-catching.

**What the original rationale below still gets right, unchanged by the revision**: "entire content
region" still means *this tab's rendered subtree*, since `ContentRegion` renders exactly one tab's
component into that space at a time (see R5 of 003-restaurant-map for the same
`key={activeTab}` mechanism) — the header, hero, and nav bar are siblings outside `ContentRegion`
and remain structurally unaffected either way (FR-007). And unlike 003-restaurant-map (which had
to fix a hardcoded 4-column nav grid for a genuinely *new* fifth tab), this feature adds no new
tab and no new nav entry — `guest-wifi` has been registered in `TABS` since 001-lobby-kiosk-shell.
There is still no shared-chrome change of any kind in this plan; the revision only removed local
CSS, it didn't add any.

**Contrast obligation**: no longer applicable in the way originally written — there are no new
colours to compute ratios for. The reused pairs' ratios are already documented in `tokens.css`
itself. See [contracts/visual-theme.md](contracts/visual-theme.md).

**Alternatives considered (at the time of the original, dark-background decision)**:
- *Add dark-theme tokens to the global `tokens.css`*: rejected — those tokens would exist for
  exactly one consumer, contradicting Constitution IX (a shared file should not carry
  single-feature concerns) and 001's tab-module contract ("no cross-tab imports... shared UI
  belongs in `src/components/`" — the inverse also holds: single-tab UI does not belong in shared
  files). Moot after the revision, since no dark tokens exist to place anywhere.
- *A `data-theme="dark"` attribute toggled on the shell*: would affect the header/nav/hero too
  unless every one of their styles is re-guarded per-tab, which is far more shared-chrome surface
  area than the one CSS module this feature actually needs to add. Also moot after the revision.

---

## R6 — Bounding the SSID/password length without inventing an arbitrary cap

**Decision**: Validate the static config against the real IEEE 802.11 protocol limits: SSID
1–32 bytes, WPA/WPA2 passphrase 8–63 ASCII characters (or empty for an open network). Enforce this
with a unit test against `wifiConfig.static.ts`, the same pattern 003-restaurant-map used for its
`MAX_RESTAURANTS` cap. Lay out the panel's typography to comfortably fit the worst case (32 + 63
characters) at 1920x1280 without wrapping past two lines each.

**Rationale**: Constitution II requires "an explicit strategy for staying within the fixed
viewport" for any content whose volume could vary. A guest network's credentials are
operator-entered, not user-entered, but they are still a value that could in principle be long
enough to threaten no-scroll layout (FR-008). Rather than picking an arbitrary display character
limit, this feature validates against the *actual* protocol ceiling a real Wi-Fi network already
enforces — a value no operator's real config can ever legally exceed, which makes the "worst case"
concrete and testable instead of a guess.

**Alternatives considered**:
- *An arbitrary shorter display cap with truncation (e.g. 24 chars)*: would visually truncate a
  legal, real SSID or password, which is a worse failure than the (larger, but still bounded)
  layout accommodating the true maximum.
- *No validation, rely on manual review of the config file*: rejected — 003-restaurant-map's
  `restaurants.test.ts` precedent exists specifically because manual review is not the layer that
  should catch shape/size mistakes.

---

## R7 — What "not configured" means, and how the fallback is detected

**Decision**: Treat an empty-string `ssid` in `wifiConfig.static.ts` as the signal that the guest
network has not been configured yet. When detected, render the FR-014 fallback state instead of
attempting to build a QR payload or matrix from empty data.

**Rationale**: An empty SSID is never valid on a real network (802.11 requires at least 1 byte), so
it cannot collide with a legitimate configured value — there is no separate "is configured" flag to
keep in sync, avoiding a second source of truth for the same fact. This mirrors how
003-restaurant-map's `MAP_ID` placeholder constant is checked structurally rather than through an
extra boolean.

**Alternatives considered**:
- *A separate `configured: boolean` field*: adds a value that can disagree with the data it
  describes (e.g. `configured: true` with an empty `ssid`), which is exactly the kind of
  duplicated-truth bug the empty-string check avoids.

---

## R8 — Tab identity: already settled

**Decision**: No change. `id: 'guest-wifi'`, labels `{ en: 'Guest Wi-Fi', hu: 'Vendég Wi-Fi' }`,
icon `Wifi` (lucide-react), accent `rose` — all already defined in the existing
`src/tabs/guest-wifi/meta.ts` from when the tab was first scaffolded as a placeholder.

**Rationale**: This feature replaces the placeholder's *content*, not its identity (Note on scope,
spec.md). The `rose` accent continues to apply only to the tab's nav-bar button, which stays in the
shell's normal light theme (FR-007) — it has no interaction with the new dark, in-panel colour
tokens from R5, which are scoped entirely inside the content region.

---

## R9 — Persisting an operator's edit without a backend

**Decision**: `localStorage`, written and read through `wifiConfig.storage.ts`, under a namespaced
key (`eic-totempole:guest-wifi-config`).

**Rationale**: User Story 4 needs *some* form of runtime-writable persistence — the whole point is
that an operator's edit survives a reload without a redeploy. The constitution rules out a backend
(Principle VIII), which rules out any server-held state. Of what is left, `localStorage` is the
simplest mechanism that satisfies the actual requirement: persistence on *this one device*,
synchronous to read (no `async`/loading state needed at mount, unlike `IndexedDB`), and already
proven to work correctly under `jsdom` in this project's `unit` test project (confirmed in
`wifiConfig.storage.test.ts` — no environment shimming needed).

This does not weaken Constitution VI or VIII. VI is about *shipped* secrets — nothing here is
baked into the built bundle; the value is entered by an operator, at the device, into that
device's own storage. VIII's rationale is about avoiding a live *backend* dependency; reading a
value back from the same browser that wrote it introduces no such dependency, no network call, and
no new failure mode across a multi-day uptime (Principle V) beyond what `localStorage` itself
already guarantees (synchronous, no timers, no polling — see R4's reasoning, which extends
unchanged to this feature).

**Alternatives considered**:
- *`IndexedDB`*: asynchronous API would force `GuestWifi` to render a loading state before it
  knows whether an override exists, for no benefit — the stored value here is a few dozen bytes,
  nowhere near where `IndexedDB`'s advantages (larger data, transactions, indexes) matter.
- *A cookie*: sent with every request to the same origin, which this static SPA never makes for
  its own assets after the initial load — pure overhead with no benefit, and a smaller practical
  size limit than `localStorage`.
- *In-memory only (React state, no persistence)*: rejected outright — it would silently violate
  spec FR-018 (Acceptance Scenario 5) the moment the kiosk reloads or the browser restarts, which
  is exactly the scenario an unattended kiosk needs to survive.
- *A backend endpoint*: rejected by the constitution before any other tradeoff — Principle VIII,
  and it would also need authentication to be safe, which is a much larger feature than requested.

## R10 — No access control on the editor

**Decision**: The Edit control is available to anyone at the kiosk, with no PIN, confirmation
dialog, or staff-only unlock gating it.

**Rationale**: This was a real design fork — the alternative (some form of protection) is equally
plausible for a control that can change what every visitor connects to. The kiosk's existing
interaction model has no authentication anywhere (the nav bar, the language toggle, and every
other tab are equally available to anyone standing in front of it), and the deployment context
recorded in the shell's own copy is an "Executive Lobby Kiosk" — a staffed, controlled space, not
an unattended public terminal. Matching the existing zero-auth posture is therefore the
consistent default, not a gap. See spec.md's Assumptions for the explicit condition under which
this should be revisited (a more public, unstaffed placement).

**Alternatives considered**:
- *A PIN entry before the editor opens*: rejected as unrequested scope — it introduces a new
  interaction pattern (a numeric keypad, a stored/configurable PIN, a "forgot PIN" problem) that
  is a meaningfully larger feature than "let an operator edit the network," and nothing in the
  request asked for it.
- *A confirmation step before Save*: rejected — Constitution IV's no-modal rule already shapes
  this away from a dialog, and an inline "are you sure" adds friction for the common case
  (operator fixes a typo) to guard against a rare one (an unintended visitor edit) that is already
  cheaply recoverable by editing again.
