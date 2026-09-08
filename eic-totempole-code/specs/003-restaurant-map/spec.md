# Feature Specification: Restaurant Map

**Feature Branch**: `feature/mappage` (spec directory: `003-restaurant-map`)

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "As a new feature on the current branch feature/mappage, create a specification for a new restaurant map page. Goal: Add a dedicated page where users can view a map containing a predefined set of selected restaurant locations. User flow: The landing page should contain a button that navigates to the new map page. The map page should display an embedded Google Maps map. The Google Maps map should show a predefined set of selected restaurant places. Users should be able to view the restaurant locations directly on the map."

## Interpretation Note: "page" and "navigate"

The request asks for a separate *page* reached by a *button* that *navigates*. Constitution
Principle IV (Single-Page, Inline-Only Updates) forbids client-side route changes, modals, and
popups. This spec therefore delivers the same user-visible outcome — a dedicated destination for
the restaurant map, reached with one tap from the main screen — as an **inline view state within
the existing single page**, matching how every other destination on this kiosk already works. No
requirement below depends on a URL change, a browser history entry, or a new document.

By default the map destination renders in the kiosk's content region with the header, hero and
navigation bar still visible, exactly like every other destination, so leaving it is a single tap
on another navigation entry. A user who wants more detail can explicitly expand the map to fill
the whole viewport, and a persistent back control returns it to the default state
(Clarifications, 2026-09-08). Both states are inline states of the same single page — the
expanded state is not a route, an overlay dialog, or a popup.

Similarly, "the landing page" is read as the kiosk's main screen (the always-visible shell with
its primary navigation), since this application has exactly one page.

## Clarifications

### Session 2026-09-08

- Q: How should the map actually be embedded, given that the constitution forbids shipping any API key in the client and this app has no backend today? (FR-017) → A: Keyless Google Maps embed of a custom "My Maps" map — no API key, no backend; pin data is authored in Google My Maps, and the in-repo restaurant list remains the source for the offline fallback, kept in sync editorially.
- Q: Should the map view occupy only the kiosk's content region with the existing header, hero and navigation bar still visible, or take over the whole screen? → A: Content region by default, plus an explicit toggle that expands the map to the full viewport; while expanded, a persistent back control returns it to the default state.
- Q: How should a visitor read a restaurant's name — from labels drawn on the map itself, by tapping a pin, or from a list shown next to the map? (FR-006) → A: Numbered pins on the map plus a numbered companion list of names rendered from the in-repo data, shown beside the map in the default state and hidden in the expanded state.
- Q: What is the maximum number of restaurants the curated set may contain? → A: A hard cap of 8.
- Q: Does the embedded map need a consent step or privacy notice before it loads, given the kiosk runs in the EU and the embed contacts Google? (FR-017) → A: Neither. The map loads as soon as the destination is opened; no consent gate and no added privacy notice.

### Session 2026-09-08 (post-plan)

- Q: When nobody has touched the kiosk for 30 seconds while the restaurant map is open, should the map fade to 16% opacity along with the rest of the screen, as every other destination does? → A: Yes — no exemption. The map view participates in attract mode exactly like every other destination, in both display states.
- Q: What is the longest a single visitor may keep the map open through continuous interaction before the kiosk reclaims itself anyway? (FR-012) → A: 10 minutes. Interaction with the map extends the idle deadline up to a 10-minute session ceiling, after which the normal idle reset proceeds regardless.
- Q: What should happen when Google itself returns an error page inside the map frame — a deleted map, revoked sharing, or rate limiting — which the kiosk cannot detect? (FR-013) → A: Narrow FR-013 to detectable failures only (no load within 5s, or offline), record the provider-error-page class as a known limitation, and correct SC-005 and the edge case that wrongly claimed the fallback covers it. The always-visible companion list is the standing mitigation.
- Q: What should each entry in the companion list show besides the number and the restaurant name? (FR-006) → A: Walking time from the building, on one line per row (e.g. "3. Kispiac · 5 min"). Street addresses continue to appear only in the offline fallback.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor finds nearby restaurants from the lobby screen (Priority: P1)

A visitor or employee standing at the lobby kiosk wants to know where they can eat nearby. From
the main screen they tap a clearly labelled control for the restaurant map, and the content region
is immediately replaced by a map of the surrounding area with every curated restaurant pinned and
numbered, alongside a numbered list of their names. They can read every restaurant name and see
where each one sits relative to the building, without touching anything else.

**Why this priority**: This is the entire value of the feature. Without it there is no map; with
it alone the feature is already useful and shippable. Every other story refines this one.

**Independent Test**: With no other story implemented, tap the restaurant map control on the main
screen and confirm the map view appears in place, shows a numbered pin for every restaurant in the
curated set, and names every one of them in the companion list without any further interaction.

**Acceptance Scenarios**:

1. **Given** the kiosk is on its main screen, **When** a user taps the restaurant map control,
   **Then** the map view replaces the previous content inline, with no new page, no browser
   navigation, no modal, and no popup.
2. **Given** the map view is active, **When** the map has loaded, **Then** a distinct numbered pin is
   shown for every restaurant in the curated set, and no pin is shown for a place that is not
   in the curated set.
3. **Given** the map view is active at the kiosk's 1920x1280 viewport, **When** the map is
   displayed at its initial framing, **Then** every curated restaurant pin is inside the
   visible map area without the user panning or zooming.
4. **Given** the map view is active in its default state, **When** the user reads the screen,
   **Then** every restaurant's name is legible without any tap, each name carries a number, and
   the pin bearing that same number is visible on the map.
5. **Given** the map view is active, **When** the language is toggled between EN and HU,
   **Then** all surrounding labels and instructional text switch language (restaurant proper
   names are unchanged).
6. **Given** the map view is active, **When** the user taps any control that the embedded map
   itself offers, **Then** the kiosk never opens a new browser tab, window, or external
   application, and never leaves the kiosk application.

---

### User Story 2 - A visitor explores the map by touch and it recovers on its own (Priority: P2)

A user pans and zooms the map with touch to look more closely at a particular restaurant or at
the walking route between the building and a restaurant, and can expand the map to fill the whole
screen when they want more detail. When they walk away, the kiosk returns itself to its default
state — collapsed, at the original framing — so the next person starts from a clean, correct view
rather than a random corner of the city on a screen with no navigation bar.

**Why this priority**: Exploration makes the map genuinely useful rather than a picture, but the
feature still delivers value without it (Story 1 alone). Self-recovery is what makes exploration
safe on an unattended kiosk, so the two ship together.

**Independent Test**: Expand the map, pan and zoom away from its initial framing, stop touching
the screen, wait out the idle period, and confirm the kiosk returns to its default state and that
re-entering the map view shows the collapsed default state at the original framing with all
restaurants visible again.

**Acceptance Scenarios**:

1. **Given** the map view is active, **When** the user drags or pinches on the map, **Then** the
   map pans and zooms in response to touch alone (no hover, no right-click, no keyboard needed).
2. **Given** the map view is active, **When** the user pans or zooms the map, **Then** that
   interaction counts as user activity for the idle timer, so the map is not reset out from under
   an actively working visitor.
3. **Given** the user has panned or zoomed the map and then stops touching the screen, **When**
   the idle period elapses, **Then** the kiosk returns to its default state.
4. **Given** the kiosk has reset after map exploration, **When** a user opens the map view again,
   **Then** the map shows its initial framing in the default (collapsed) state with every curated
   restaurant visible — not the previous user's pan/zoom position and not their expanded state.
5. **Given** a user enters and leaves the map view many times in a session, **When** the map view
   is re-entered, **Then** behaviour is identical each time, with no duplicated pins and no
   accumulated state.
6. **Given** the map view is in its default state, **When** the user taps the expand control,
   **Then** the map fills the whole viewport, every curated restaurant is still visible at the
   initial framing, and a return control is visible without scrolling or hunting.
7. **Given** the map is expanded, **When** the user taps the return control, **Then** the default
   state comes back with the header, hero and navigation bar visible again.
8. **Given** the map is expanded, **When** the user walks away and the idle period elapses,
   **Then** the kiosk exits the expanded state as part of its normal reset, leaving no visitor
   stranded in a screen with no navigation bar.
9. **Given** the map view has been open and apparently active for 10 minutes, **When** the ceiling
   is reached, **Then** the kiosk performs its normal idle reset regardless of further map
   activity, returning to the default destination in the collapsed state (FR-036).

---

### User Story 3 - The screen stays useful when the map cannot load (Priority: P3)

The kiosk's network is down, slow, or the map provider is blocked. Instead of a blank rectangle,
a spinner that never resolves, or a provider error page, the user sees a readable list of the
curated restaurants with their names and addresses, so the screen still answers "where can I
eat nearby?"

**Why this priority**: A pure resilience story. The feature is demonstrable and valuable without
it, but on an unattended multi-day kiosk with a live third-party dependency, a broken frame is a
visible public failure with nobody there to fix it.

**Independent Test**: Block or disable network access to the map provider, open the map view, and
confirm that within a bounded wait the view shows the fallback list of restaurant names and
addresses with an explanatory message, and never shows a raw provider error or an empty frame.

**Acceptance Scenarios**:

1. **Given** the map provider is unreachable, **When** the user opens the map view, **Then**
   within 5 seconds the view shows the curated restaurants as a readable list with names and
   addresses, plus a short explanation that the live map is unavailable.
2. **Given** the map provider is unreachable, **When** the fallback is shown, **Then** no raw
   provider error text, error code, or empty embedded frame is visible to the user.
3. **Given** the map is loading normally, **When** it has not yet finished, **Then** the user sees
   a calm loading state rather than an empty region, and the loading state never persists
   indefinitely.
4. **Given** the fallback is displayed, **When** the kiosk resets and a user re-opens the map view
   after connectivity has returned, **Then** the live map is shown without requiring a page
   reload or manual intervention.

---

### Edge Cases

- **Map provider unreachable, slow, or rate-limited**: covered by User Story 3 — bounded wait,
  then a static readable fallback. This is the primary expected failure mode, since the map is
  the feature's only live external dependency.
- **The embedded map offers its own links** (e.g. "view larger map", "directions", provider
  branding, terms links): these would open a new tab or an external site, stranding the kiosk
  outside the application with no keyboard, no address bar, and nobody to recover it. Any such
  affordance MUST be suppressed or rendered inert (FR-008).
- **User pans far away and walks off**: the map is left showing an unrelated part of the world.
  Resolved by resetting the map framing on idle reset and on re-entry (FR-011).
- **A restaurant's pin overlaps another** at the initial zoom because two places are close
  together: the numbered companion list (FR-006) means both restaurants are still named on screen
  even when their pins crowd, so no restaurant is silently missing. The pins themselves must still
  be distinguishable enough that each number can be matched to a location.
- **A visitor expands the map before reading the companion list**, so they see numbered pins with
  no names (FR-029). The numbers are meaningless to them until they collapse the map. The return
  control (FR-025) must therefore be obvious enough that this is a one-tap recovery, not a
  dead end.
- **A very long restaurant name** must not overflow the fixed viewport or push other content off
  screen; names are truncated or wrapped within the allotted region, never allowed to cause
  scrolling.
- **The curated set is empty or has a single entry**: the view MUST still render sensibly (a
  reasonable default framing centred on the building) rather than zooming to an undefined extent.
- **The curated set grows past the 8-restaurant cap** (FR-031): this is a defect to be caught
  before shipping, not absorbed at runtime by shrinking type or clipping the companion list. The
  worst case to verify is exactly 8 entries with the longest authored names in Hungarian, which is
  typically the longer of the two languages.
- **Map provider controls are smaller than the 64px touch minimum**: any provider-supplied control
  that cannot meet Principle III MUST be hidden rather than shipped as a mis-tap hazard; the
  kiosk supplies its own controls where a capability is needed.
- **Stale data**: a curated restaurant closes or moves. There is no live validation; the curated
  set is trusted hand-authored data whose accuracy is an editorial responsibility, not a system
  guarantee (see Assumptions).
- **Expanded state hides the navigation bar**: while expanded, the kiosk's normal way out is not
  on screen. The return control (FR-025) MUST therefore be persistent rather than auto-hiding or
  fading, and idle reset MUST collapse the state (FR-011), so a confused visitor is never stuck on
  a screen with no visible exit.
- **The expanded and default states have different aspect ratios**, so a framing that fits every
  restaurant in one may crop the other. FR-027 requires both states to show the full set at
  initial framing; this must be verified in both, not just the default.
- **The map is expanded when the fallback triggers** (provider unreachable): the fallback list
  must render correctly at full-viewport size too, without scrolling and without stretching a
  short list into an unreadable layout.
- **Drift between the map pins and the in-repo list**: because the two representations of the
  curated set (FR-016) are maintained by hand, an edit applied to only one of them produces a
  restaurant that appears on the map but is missing from the offline fallback, or vice versa. This
  is a defect per FR-023; the editorial procedure and a parity check are the defence.
- **The shared custom map's sharing settings change or its owner's account is removed**: the map
  stops being viewable by the public. Because the provider still responds *successfully*, this does
  **not** trigger the FR-013 fallback (FR-037) — the visitor sees the provider's own error content
  inside the frame while the companion list continues to name every restaurant. Recovery requires a
  human; this is an operational risk owned by whoever owns the map.
- **The provider rate-limits or returns an error page with a successful response**: same class as
  above, and equally undetectable from the client (FR-037). The kiosk will report the map as loaded.
  This is the known gap in the fallback's coverage, stated here rather than left to be discovered
  during acceptance testing.
- **A visitor keeps interacting with the map past the 10-minute ceiling** (FR-036): the kiosk
  resets under them. Accepted deliberately — beyond ten minutes the likelier explanation is a stuck
  activity signal or an abandoned session than a visitor still choosing lunch, and an unattended
  public display must be able to reclaim itself.
- **The map's activity signal sticks "on" after the visitor leaves**: the idle reset is suppressed
  only until the ceiling (FR-036), after which the kiosk recovers on its own. Without the ceiling
  this would be an indefinite stall that nobody is present to notice.
- **A visitor reads the map without touching it for 30 seconds**: attract mode engages and the map
  dims along with the rest of the chrome (FR-035). Because the expanded state renders inside the
  content region, it dims too. This is accepted deliberately: consistency with every other
  destination was judged more valuable than a map-only exemption, and any touch restores full
  legibility immediately. The practical consequence is that a passive reader may need to tap the
  screen once to bring the map back — which also restarts the idle countdown.
- **Language toggled while the map view is active**: surrounding labels re-render in the new
  language without resetting the map view or reloading the map.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kiosk's main screen MUST present a clearly labelled control that opens the
  restaurant map view, discoverable without hover and reachable in a single tap.
- **FR-002**: The map-opening control MUST have a touch target of at least 64x64 CSS pixels and at
  least 16px separation from adjacent interactive elements.
- **FR-003**: Activating the control MUST replace the current content inline within the existing
  single page. It MUST NOT trigger a client-side route change, browser navigation, modal dialog,
  popup, or native browser dialog.
- **FR-004**: The map view MUST display an embedded interactive map of the area surrounding the
  building.
- **FR-005**: The map view MUST plot every restaurant in a predefined curated set, and only those
  restaurants, as individually distinguishable numbered pins.
- **FR-006**: In the default state, every plotted restaurant MUST be identifiable by name with
  zero taps: the map shows a numbered pin per restaurant, and a companion list beside the map
  pairs each number with that restaurant's name and its walking time from the building. No name may
  be revealed only by hover, and none may require tapping a pin to read.
- **FR-038**: Each companion-list entry MUST occupy a single line at the kiosk's viewing-distance
  type size, so that 8 entries fit the content region without scrolling (FR-009, FR-031). Street
  addresses are therefore NOT shown in the companion list; they appear only in the offline fallback
  (FR-013), where the map area is free to hold them.
- **FR-007**: The map's initial framing MUST include every curated restaurant and the building
  itself within the visible map area, with no panning or zooming required.
- **FR-008**: The map view MUST NOT allow the user to leave the kiosk application. Any external
  link, "open in new window", provider deep-link, or download affordance originating from the
  embedded map MUST be suppressed or rendered inert.
- **FR-009**: The map view MUST fit the 1920x1280 CSS-pixel viewport exactly and MUST NOT produce
  vertical or horizontal page scrolling in any content or error state, in both its default and
  its expanded state.
- **FR-010**: The map view MUST support touch pan and zoom, and MUST NOT require a mouse,
  keyboard, hover, or right-click for any of its functionality.
- **FR-011**: Map pan/zoom position MUST reset to the initial framing, and the display state MUST
  return to the default (collapsed) state, when the kiosk performs its idle reset and whenever the
  map view is newly entered. No user inherits the previous user's view position or expanded state.
- **FR-012**: User interaction with the map (pan, zoom, pin taps) MUST count as user activity for
  the kiosk's idle-reset timer, so an actively used map is not reset out from under the user within
  a single map session. This extension is bounded: see FR-036.
- **FR-036**: Map-driven activity MUST extend the idle deadline for at most **10 minutes** of
  continuous map use, measured from entry into the map view. Once that ceiling is reached, the
  kiosk's normal idle reset MUST proceed regardless of any apparent map activity, returning to the
  default destination and collapsing any expanded state (FR-011). The ceiling exists because map
  interaction can only be detected indirectly, and an indirect signal that fails "stuck on" would
  otherwise hold a public display indefinitely with nobody present to correct it.
- **FR-013**: If the embedded map has not finished loading within 5 seconds, or the kiosk is known
  to be offline, the view MUST show a fallback listing every curated restaurant's name and address,
  plus a brief localized explanation. This covers the **detectable** failure class: network down,
  provider unreachable or blocked, name resolution failure, and hung requests. An empty frame and an
  indefinite loading state MUST NOT be shown in any of those cases.
- **FR-014**: While the map is loading, the view MUST show a bounded loading state; it MUST NOT
  remain in a loading state indefinitely.
- **FR-015**: Recovery MUST be automatic: once the map becomes reachable again, a subsequent entry
  into the map view MUST show the live map without a page reload or manual intervention.
- **FR-016**: The curated restaurant set MUST have exactly two authored representations, both owned
  by this feature and both editable without touching any other feature's code or data: (a) the
  pinned places in this feature's dedicated custom map, which supply the on-map pins, and
  (b) a static, hand-authored in-repo list, which supplies the offline fallback (FR-013).
- **FR-017**: No API key, credential, token, or other secret MAY be present in client-shipped code,
  configuration, or bundled environment variables in order to render the map. The map MUST be
  embedded by a means that requires no credential at all, so that no server-side proxy is
  introduced and the application remains a purely static deployment.
- **FR-018**: All feature-authored text (control label, headings, instructions, fallback message,
  error text) MUST be available in both English and Hungarian and MUST follow the kiosk's active
  language selection. Restaurant proper names are exempt and render as authored.
- **FR-019**: All feature text and meaningful UI elements MUST meet WCAG AA contrast minimums, and
  every interactive element MUST be reachable in keyboard focus order and carry an accessible
  name and role — including the map region and each restaurant's companion-list entry (FR-030).
- **FR-020**: Restaurant names and map labels MUST be legible at the kiosk's expected standing
  viewing distance on a 50-inch display.
- **FR-021**: The feature MUST be an isolated module that can be disabled or removed without
  modifying or breaking any other feature; it MUST NOT read or write another feature's internal
  state or storage.
- **FR-022**: Every timer, listener, subscription, or embedded-frame resource the feature creates
  MUST be torn down when the map view is left, and MUST NOT be recreated without clearing the
  prior instance. Feature state MUST NOT grow across repeated entry and exit over multi-day
  runtime.
- **FR-023**: The two representations of the curated set (FR-016) MUST list the same restaurants.
  Changing the set MUST be a single documented editorial procedure that updates both, and that
  procedure MUST be documented in the repo. A restaurant present in one representation but absent
  from the other is a defect, not an acceptable state.
- **FR-024**: The map view MUST have exactly two display states: a **default state** rendered in
  the kiosk's content region with the header, hero and navigation bar visible, and an **expanded
  state** in which the map fills the whole 1920x1280 viewport. Default is the state on entry.
- **FR-025**: The default state MUST offer a clearly labelled control that expands the map, and
  the expanded state MUST show a persistent, always-visible control that returns to the default
  state. Both controls MUST meet the 64x64 minimum touch target and 16px separation rule, MUST be
  operable without hover, and MUST carry localized accessible names.
- **FR-026**: In the default state, tapping any primary navigation entry MUST leave the map
  destination directly, with no intermediate step. The expanded state MUST NOT be a trap: its
  return control is always visible, and the kiosk's idle reset also exits it (FR-011).
- **FR-027**: Every curated restaurant MUST remain visible at the initial framing in BOTH display
  states (FR-007), so expanding or collapsing the map never hides a restaurant.
- **FR-028**: The companion list MUST be rendered from the in-repo curated list (FR-016b), not
  read from the embedded map. Its surrounding labels MUST be localized per FR-018, it MUST meet
  WCAG AA contrast, and it MUST be exposed to assistive technology as real text per FR-019.
  Restaurant proper names render as authored in both languages.
- **FR-029**: The expanded state MUST hide the companion list in order to maximize map area. Pin
  numbering MUST stay visible in the expanded state and MUST use the same numbers as the default
  state's list, so a visitor who read the list can still identify each pin after expanding.
- **FR-030**: The companion list in the default state is the only localized, provider-independent,
  assistive-technology-readable representation of restaurant names. FR-019's accessible-name
  obligation for restaurants is therefore satisfied by the default state; the expanded state is a
  visual enhancement only and MUST always remain exitable to the default state (FR-025, FR-026).
  The feature MUST NOT rely on the embedded map's own pin popups to satisfy any naming,
  localization, or accessibility requirement.
- **FR-031**: The curated restaurant set MUST contain at most 8 restaurants. The layout MUST be
  verified at the full 8 — with the longest authored names, in both EN and HU — and MUST still
  satisfy FR-009 (no scrolling) and FR-020 (legible at viewing distance). Exceeding 8 is a defect,
  not a layout problem to be solved by shrinking type.

- **FR-037**: The feature MUST NOT claim to detect failures it cannot observe. Where the map
  provider responds *successfully* with its own error content — deleted map, revoked sharing, rate
  limiting — the kiosk cannot distinguish that from a working map, and the FR-013 fallback will not
  trigger. In that state the companion list (FR-006) MUST continue to name every curated
  restaurant, so the screen still answers the visitor's question even while the map area is
  useless. Detecting and correcting this failure class is an operational responsibility of whoever
  owns the map, not a runtime behaviour of the kiosk.
- **FR-035**: The map view MUST participate in the kiosk's existing attract behaviour on the same
  terms as every other destination, in both display states. It MUST NOT be exempted, MUST NOT use a
  longer threshold, and MUST NOT suppress attract mode for the shell. Any touch restores full
  legibility immediately, as elsewhere.
- **FR-032**: The map MUST load as soon as the map destination is opened. There MUST be no consent
  gate, no click-to-load placeholder, and no added privacy notice or interstitial — the visitor
  reaches the map in one tap (SC-001) with no intervening step.
- **FR-033**: The feature MUST NOT collect, store, or transmit any personal data about the
  visitor. It MUST NOT ask for identity, MUST NOT persist per-visitor state between sessions, and
  MUST NOT add analytics or tracking of its own beyond the network requests the embedded map
  itself makes to render.
- **FR-034**: The map provider's own branding and attribution rendered inside the embed MUST NOT
  be hidden or obscured. FR-008 suppresses outbound *navigation* from the embed, not the
  provider's attribution, which stays visible as the embed presents it.

### Key Entities

- **Restaurant Place**: One curated dining location shown on the map. Attributes: display name,
  street address (used by the offline fallback and for user orientation), a geographic location
  precise enough to plot a pin, a stable list number that pairs its companion-list entry with its
  map pin (FR-006), and a **walking time from the building** shown in the companion list (FR-006,
  FR-038). Optionally a short descriptor such as cuisine type. The walking time is an editorial
  estimate, not computed from live routing data (Out of Scope). Hand-authored throughout; not
  fetched from a live directory.
- **Curated Restaurant Set**: The ordered collection of Restaurant Places shown by this feature.
  Owned entirely by this feature and capped at 8 entries (FR-031) so it always displays legibly at
  the fixed viewport. It is
  authored in two places (FR-016): the pinned places in the feature's custom map, which drive the
  on-map pins, and the in-repo list, which drives the offline fallback. Because the embedded
  map is keyless, the map's pins are not readable by the application at runtime, so these two
  representations cannot be derived from one another and are instead kept identical by a
  documented editorial procedure (FR-023). Drift between them is the feature's main data risk.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from the kiosk's main screen to a map showing every curated
  restaurant in exactly one tap.
- **SC-002**: The map view is fully rendered with all restaurant pins within 3 seconds of the
  tap under normal network conditions.
- **SC-003**: 100% of curated restaurants are visible at the initial framing without any panning
  or zooming, verified at the 1920x1280 viewport.
- **SC-004**: No content or error state of the map view produces page scrolling at the 1920x1280
  viewport, in either the default or the expanded state, including the longest-name and empty-set
  cases.
- **SC-005**: When the map provider is unreachable or the kiosk is offline, the fallback appears
  within 5 seconds and shows the name and address of 100% of curated restaurants, with no empty
  frame and no indefinite loading state in any trial. Failures where the provider responds
  successfully with its own error content are outside this criterion — see FR-037.
- **SC-006**: In 0 out of 20 attempted trials can a user reach any destination outside the kiosk
  application (new tab, external site, browser dialog) from the map view.
- **SC-007**: 9 out of 10 first-time users can name at least one restaurant shown and point to its
  approximate location relative to the building within 30 seconds, with no assistance and no
  instructions beyond what is on screen.
- **SC-008**: After 72 hours of continuous unattended runtime with repeated entry into and exit
  from the map view, the kiosk still renders the map correctly with no page reload, no growth in
  retained state, and no duplicated timers or listeners.
- **SC-009**: 100% of the feature's interactive elements meet the 64px minimum touch target and
  16px separation rule at the target viewport.
- **SC-010**: 100% of feature-authored on-screen text renders correctly in both EN and HU, with no
  untranslated strings and no layout overflow in either language.
- **SC-011**: The restaurants pinned on the embedded map and the restaurants in the in-repo
  fallback list match exactly — same names, same count, zero entries present in only one of them.
- **SC-012**: The shipped application contains zero API keys, tokens, or credentials attributable
  to the map, verifiable by inspecting the built bundle and the kiosk's outbound requests.
- **SC-013**: From anywhere in the map view, a user can return to another kiosk destination in at
  most two taps — one from the default state (a navigation entry), two from the expanded state
  (return, then a navigation entry).
- **SC-014**: In the default state, 100% of curated restaurant names and their walking times are
  readable with zero taps, and each name's number matches a pin visible on the map.
- **SC-015**: Every restaurant name on screen is available to assistive technology as text in the
  default state, with 0 names reachable only through the embedded map's own popups.

- **SC-016**: With the curated set at its maximum of 8 restaurants and the longest authored names
  in both EN and HU, the default state shows all 8 entries as single lines, in full, with no
  scrolling and no truncation that hides a restaurant's identity or its walking time.

- **SC-017**: A visitor interacting with the map continuously is not reset for at least 5 minutes,
  and the kiosk does reset by 10 minutes and 30 seconds regardless of apparent map activity
  (FR-036).

## Assumptions

- **"Page" means an inline view state.** Per the Interpretation Note above, this is delivered as a
  destination within the existing single page — rendered in the content region by default, with an
  optional expanded state that fills the viewport (FR-024) — consistent with Constitution
  Principle IV and with how every current kiosk destination behaves.
- **"A button on the landing page" means an entry in the kiosk's existing primary navigation.**
  Those nav entries already are the touch buttons on the main screen, and the existing
  architecture treats a new destination as a new module registered there. A second, separate
  call-to-action button elsewhere on the main screen is not assumed and is out of scope.
- **The curated set is hand-authored, trusted, static data** — at most 8 restaurants (FR-031)
  within short walking distance of the office, chosen editorially. There is no live restaurant
  search, no ratings feed, no opening-hours lookup, and no validation that a listed restaurant is
  still open. Keeping the list current is an editorial task, not a system guarantee.
- **The 8-restaurant cap is a hard product limit**, not a soft target, per Constitution
  Principle II — an unbounded list of restaurants is explicitly not supported, and growing past 8
  requires revisiting this spec rather than adjusting the layout.
- **The map is interactive, not a static image.** "Embedded Google Maps map" is read as a live
  embedded map the user can pan and zoom, which is why FR-011 and FR-012 exist.
- **The map is a keyless Google Maps embed of a custom "My Maps" map** (Clarifications,
  2026-09-08). The restaurants are pinned in a Google My Maps map owned by this feature, and the
  kiosk embeds that map. This satisfies FR-017 with no API key and no backend proxy, so the
  application stays a purely static deployment, and it keeps the embedded map interactive.
  The accepted cost is that the pins live in Google rather than in the repo, which is why FR-016
  and FR-023 define two authored representations and require them to be kept identical.
- **The Google My Maps map is treated as feature-owned infrastructure**: its ownership, sharing
  settings (public/unlisted so the kiosk can render it without signing in), and edit access are
  provisioned as part of this feature, not assumed to already exist.
- **The map is this feature's only live external dependency.** This is a deliberate, scoped
  exception to Constitution Principle VIII (Static-First Delivery): an embedded map cannot be
  pre-rendered as a static asset without losing the pan/zoom exploration the feature exists to
  provide. FR-013 through FR-015 exist to bound the cost of that exception on an unattended
  device. **This exception should be confirmed at plan time**; if it is rejected, the fallback
  view (FR-013) becomes the whole feature and Story 2 is dropped.
- **The kiosk's existing idle-reset behaviour is reused**, not reimplemented — this feature only
  needs to participate in it correctly (FR-011, FR-012).
- **The kiosk's existing EN/HU language mechanism is reused** for all feature-authored text.
- **Network access from the kiosk to the map provider is permitted** by the venue's network policy
  under normal operation. FR-013 covers the case where it is not.
- **No consent gate or added privacy notice is required for the embed** (Clarifications,
  2026-09-08, FR-032). This rests on three conditions: visitors are anonymous and never identified
  by the kiosk, the feature stores no per-visitor state (FR-033), and the IP address reaching the
  map provider is the building's rather than any individual's. **If any of those three stops being
  true** — for example if the kiosk later gains sign-in, per-visitor personalization, or
  analytics — this decision must be revisited, since the basis for it would no longer hold.
- **The provider's own attribution inside the embed is considered sufficient acknowledgement**
  that a third-party map is in use (FR-034); no additional kiosk-authored notice is added.

## Out of Scope

- Turn-by-turn directions, route planning, or walking-time calculation from live data.
- Live restaurant data: opening hours, menus, ratings, reviews, photos, or availability.
- User-submitted content: adding, rating, favouriting, or reporting a restaurant.
- Search, filtering, or sorting of restaurants (by cuisine, price, distance, etc.).
- Any per-user state, personalization, or memory of a previous visitor's activity.
- Consent management, cookie banners, or a click-to-load privacy gate for the embedded map
  (FR-032) — excluded by decision, on the basis recorded in Assumptions.
- Analytics, usage counting, or any telemetry about how visitors use the map (FR-033).
- Booking, ordering, calling, or any transaction with a restaurant.
- Sharing to a phone (QR code, link handoff) — a plausible future addition, not part of this
  feature.
- Non-restaurant points of interest (transit stops, shops, landmarks) — the existing Local Transit
  destination is a separate, independent feature and this one does not extend or depend on it.
