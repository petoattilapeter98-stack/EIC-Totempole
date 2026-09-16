# Feature Specification: Guest Wi-Fi Panel

**Feature Branch**: `feature/guest-wifi`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "As a new feature, replace the placeholder Guest Wi-Fi tab (src/tabs/guest-wifi) with a real Guest Wi-Fi panel. Goal: give a visitor standing at the kiosk everything they need to get their own phone or laptop onto the guest network in one glance, presented in a visually immersive, glowing way that draws attention to the tab and stands apart from the kiosk's normal light, high-contrast theme. User flow: the visitor taps the Guest Wi-Fi tab in the nav bar; the content region shows a scannable QR code that auto-joins the guest network (standard WIFI: URI scheme, so a phone camera can join without typing anything), plus the network name (SSID) and password printed in large, legible text beside it for anyone who wants to type it in manually or whose camera won't scan. The SSID, password, and security type (e.g. WPA2) come from a static in-repo config file, following the same pattern as the restaurant data (restaurants.static.ts) — edited and redeployed whenever the network credentials change, no backend, no secrets fetched at runtime. Visual treatment: unlike the rest of the kiosk's light brand-navy/orange/blue theme, this tab gets a dedicated dark background with a vivid, continuously pulsing/glowing aura around the QR code and credentials, using the existing motion tokens (--motion-pulse, --motion-float) as a starting point for timing — the glow runs constantly for as long as the tab is open, not only during attract mode, so it actively attracts a passerby's eye. Surrounding labels (e.g. \"Scan to connect\", \"Network name\", \"Password\") must switch between EN and HU with the language toggle; the SSID and password text itself does not change with language. This remains an inline panel within the existing single-page shell (no modal, no route change), fits the fixed 1920x1280 viewport with no scroll, meets the 64px touch target minimum for any interactive element, and any glow animation must be safe for multi-day unattended runtime (bounded, cleanly torn down, no accumulating state) per the project constitution."

## Note on scope

`src/tabs/guest-wifi` already exists in the codebase as a registered nav tab rendering a generic
placeholder. This feature replaces that placeholder's content only — the tab's identity, nav
label, icon, and position in the tab bar are unchanged. Implementation happens on branch
`feature/guest-wifi`, created off `main`; the feature directory `specs/004-guest-wifi` is
independent of the branch name.

## Clarifications

### Session 2026-09-10

- Q: Does the panel's dark background and glow animation participate in the kiosk's standard
  idle/attract dimming (fading to ~16% opacity after 30 seconds of no interaction) the same as
  every other tab, or is it exempted so it keeps attracting attention while idle? → A: No
  exemption. The panel dims to the same ~16% opacity as every other tab after the standard idle
  period; the glow/pulse animation itself may keep running underneath the dim rather than
  stopping outright. This matches the precedent set by the Restaurant Map feature, where every
  destination participates in attract mode identically.
- Q: Does the QR code itself need to keep a standard light-background/dark-module color scheme
  so phone cameras can reliably scan it, with the glow effect applied only around it, or should
  the glow's color treatment apply to the QR code's own colors too? → A: The QR code keeps a
  standard light quiet-zone/dark-module color scheme at all times; the glow/aura effect is
  applied only around the code, as a frame, and never alters the QR code's own colors.
- Q: Should the dark, glowing treatment cover the entire content region where tab content
  renders, or just an inner card/panel within it, with the rest of the content region kept in
  the kiosk's normal light background? → A: The entire content region goes dark for this tab;
  the header, hero, and navigation bar outside the content region are unaffected and stay in
  their normal light state.

### Session 2026-09-10 (post-implementation revision)

- **Superseded above**: after seeing the dark-background version built and running, the
  decision was reversed — the panel now uses the SAME white content-region surface every other
  tab renders into (`--color-surface`, via the shared `.content` card in `App.module.css`),
  rather than a dark background of its own. The "visually immersive, glowing" identity comes
  entirely from the animated brand-colour wash across the panel; the panel no longer "stands
  apart" from the rest of the kiosk visually. FR-009, FR-012, and SC-003 below reflect this
  revision directly rather than being marked historical, since the dark-background wording is no
  longer accurate to the shipped feature.
- **Second revision, same session**: the glow itself was also moved, from a halo confined to the
  QR code to an ambient wash across the whole panel — direct feedback that the QR-scoped glow
  "doesn't really fit into the page" and should "affect the whole panel" instead. FR-009 reflects
  this directly too. See `contracts/visual-theme.md` for the design detail.

### Session 2026-09-10 (feature addition: on-screen editing)

- **Added, not clarified**: after the panel above was working, a further request extended the
  feature — an on-screen "Edit" control so an operator can set or change the guest network
  directly at the kiosk, without redeploying code. This was not a clarification of an existing
  requirement; it is new scope, captured as User Story 4 and FR-015–FR-019 below. No access
  control (PIN, staff login) was requested or added — see Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor scans a code and is online in seconds (Priority: P1)

A visitor standing at the lobby kiosk wants their phone on the internet. They tap the Guest
Wi-Fi tab in the nav bar, and the content region is immediately replaced by a panel — matching
every other tab's light surface — centered on a glowing QR code. They open their phone's camera,
point it at the screen, and their phone offers to join the network — no typing, no separate
Wi-Fi settings screen, no app.

**Why this priority**: This is the entire value of the feature. Without it there is no
self-serve way to get online; with it alone the feature is already useful and shippable. Every
other story refines this one.

**Independent Test**: With no other story implemented, tap the Guest Wi-Fi tab and confirm a QR
code appears that, when scanned with a standard phone camera app, offers to join the configured
guest network without any manual entry.

**Acceptance Scenarios**:

1. **Given** the kiosk is on its main screen, **When** a user taps the Guest Wi-Fi tab, **Then**
   the panel replaces the previous content inline, with no new page, no browser navigation, no
   modal, and no popup.
2. **Given** the Guest Wi-Fi panel is active, **When** a phone camera is pointed at the QR code,
   **Then** the phone recognizes it as a Wi-Fi network code and offers to join the configured
   guest network directly, without the visitor typing anything.
3. **Given** the Guest Wi-Fi panel is active at the kiosk's 1920x1280 viewport, **When** the
   panel is displayed, **Then** the QR code, network name, and password are all visible at once
   with no scrolling and no part cut off.

---

### User Story 2 - A visitor without a working scanner connects manually (Priority: P2)

A visitor whose phone camera won't recognize the code, or who is setting up a laptop instead,
reads the network name and password printed in large text next to the QR code and types them
into their own device's Wi-Fi settings.

**Why this priority**: Not every device can scan a QR code (most laptops can't), so the feature
is incomplete without a manual fallback — but the QR path alone (Story 1) already delivers the
primary value for the majority of visitors.

**Independent Test**: With Story 1 implemented, cover or ignore the QR code and confirm the
network name and password are independently legible and sufficient to join the network by hand
on a device's normal Wi-Fi settings screen.

**Acceptance Scenarios**:

1. **Given** the Guest Wi-Fi panel is active, **When** the user reads the screen without
   scanning anything, **Then** the network name and password are both shown as plain text, large
   and legible at a normal standing viewing distance, with no tap required to reveal either.
2. **Given** the guest network's credentials have not yet been configured (e.g. a fresh
   deployment before the config file is filled in), **When** the panel is displayed, **Then** it
   shows a clear placeholder/fallback state rather than a blank area or broken layout.

---

### User Story 3 - A visitor switches language and the panel stays correct (Priority: P3)

A visitor toggles the kiosk between EN and HU while on the Guest Wi-Fi panel. The instructional
labels around the QR code and credentials switch language immediately; the network name and
password themselves do not change, since they are literal values, not translatable content.

**Why this priority**: Language correctness matters for a bilingual lobby, but the feature is
already fully usable in either language without this story — it's a polish/consistency pass on
top of Stories 1 and 2.

**Independent Test**: With Story 1 implemented, toggle the language control while the Guest
Wi-Fi panel is open and confirm all instructional text switches language while the SSID and
password strings remain identical.

**Acceptance Scenarios**:

1. **Given** the Guest Wi-Fi panel is active, **When** the user toggles the language between EN
   and HU, **Then** every instructional label on the panel (e.g. "Scan to connect", "Network
   name", "Password") switches language, and the network name and password text is unchanged.

---

### User Story 4 - An operator sets or updates the network from the kiosk itself (Priority: P4)

Whoever manages the kiosk needs to set the guest network for the first time, or change it later
(a router reset, a new password policy), without asking someone to edit source code and redeploy
the whole application. They tap an "Edit" control on the panel, type the new network name and
password (or mark the network as open, no password), and save — the panel immediately shows the
updated QR code and credentials to the next visitor.

**Why this priority**: Every other story depends on the network already being known; this story
is about *how* it becomes known and stays current. It is genuinely valuable — it is the
difference between "ask a developer to redeploy" and "an operator standing at the kiosk fixes
it themselves" — but the kiosk is fully useful to visitors without it, since a code-edited static
default (`wifiConfig.static.ts`) still works exactly as before.

**Independent Test**: With no other story implemented, tap Edit, enter a network name and
password, tap Save, and confirm the panel immediately shows the new values — then reload the
kiosk and confirm they are still there.

**Acceptance Scenarios**:

1. **Given** the Guest Wi-Fi panel is active (configured or not-configured), **When** the
   operator taps Edit, **Then** an inline form appears within the same panel — no modal, no new
   page — pre-filled with the current network name and password if one is already configured.
2. **Given** the editor is open, **When** the operator enters a network name (1–32 characters)
   and a password (8–63 characters, or marks the network open/no password) and taps Save,
   **Then** the panel returns to its normal display showing the new QR code and credentials
   immediately, with no page reload.
3. **Given** the editor is open with unsaved changes, **When** the operator taps Cancel,
   **Then** the panel returns to its previous display unchanged — the edit is discarded.
4. **Given** the operator enters a network name or password outside the valid length, **When**
   they attempt to save, **Then** the panel shows a specific inline error next to the invalid
   field and does not save.
5. **Given** a network was saved through the editor, **When** the kiosk is reloaded or the tab is
   revisited after navigating away, **Then** the saved network is still shown — the edit survives
   on this device without any code change or redeploy.

---

### Edge Cases

- What happens when nobody has touched the kiosk for 30 seconds while the Guest Wi-Fi panel is
  open? The panel dims to ~16% opacity along with the rest of the screen, identically to every
  other tab (Clarifications, 2026-09-10); the glow/pulse animation may continue running
  underneath the dim.
- What happens if the configured network name or password is unusually long? The panel MUST
  remain within the fixed 1920x1280 viewport with no scrolling and no truncation that makes the
  credentials unreadable or unusable.
- What happens if a visitor's phone doesn't support scanning Wi-Fi QR codes at all (older
  devices, some Android camera apps)? The always-visible printed network name and password
  (Story 2) is the standing fallback — the panel never depends on the QR code being the only way
  to get the information.
- What happens after the kiosk has displayed this panel continuously, on and off, for many days?
  The glow/pulse animation and any timers it uses MUST be torn down when the visitor navigates
  away from the tab and MUST NOT accumulate state or degrade performance on repeated open/close
  cycles.
- What happens if the device's local storage is unavailable or cleared (private browsing,
  storage explicitly wiped, a fresh device)? The panel MUST fall back to the static
  `wifiConfig.static.ts` default rather than failing to render — an edit made through the editor
  is local to the device it was saved on and is not expected to survive that device's storage
  being cleared.
- What happens if someone other than an intended operator taps Edit? Nothing prevents it — see
  Assumptions. The worst case is the guest network being changed to something wrong, which is
  recoverable the same way: open the editor again and fix it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Guest Wi-Fi destination reachable from the kiosk's main
  navigation bar, replacing the current placeholder content, reached the same way as every other
  tab (single tap, no route change, no modal).
- **FR-002**: The system MUST render a QR code within the Guest Wi-Fi panel that encodes the
  guest network's name, password, and security type using the standard Wi-Fi QR URI scheme, so
  that scanning it with a phone camera offers to join the network without manual entry. The QR
  code itself MUST keep a standard light quiet-zone/dark-module color scheme at all times, even
  within the panel's dark, glowing treatment, to preserve camera scannability (Clarifications,
  2026-09-10).
- **FR-003**: The system MUST also display the guest network's name and password as plain,
  large, legible text alongside the QR code, always visible without any tap, for visitors who
  cannot or do not want to scan.
- **FR-004**: The guest network's name, password, and security type MUST be sourced from a
  single configuration file maintained within the kiosk's codebase, edited and redeployed by
  whoever manages the kiosk whenever the network changes — never fetched from a remote service,
  entered at runtime, or requiring a backend.
- **FR-005**: The system MUST NOT require any account creation, login, or additional user data
  entry beyond scanning the code or reading the printed credentials.
- **FR-006**: All instructional/label text on the panel (e.g. "Scan to connect", "Network name",
  "Password") MUST be available in both EN and HU and MUST switch with the kiosk's existing
  language toggle; the network name and password strings themselves MUST remain unchanged by
  language.
- **FR-007**: The Guest Wi-Fi panel MUST render as an inline content-region view within the
  existing single-page shell — no client-side route, modal, or popup — with the header, hero,
  and navigation bar remaining visible exactly as for every other tab.
- **FR-008**: The panel MUST fit the fixed 1920x1280 viewport with no vertical or horizontal
  scrolling, including with the longest realistic network name and password.
- **FR-009**: The panel MUST use the same light content-region surface every other tab renders
  into (Clarifications, 2026-09-10 post-implementation revision) and a continuous glow/pulse
  effect washing across the whole panel while the tab is open and the kiosk is being actively
  used, to draw a visitor's attention to it. The glow/pulse effect MUST NOT alter the QR code's
  own colors (see FR-002) — it sits behind the code and the printed credentials, never on top of
  or blended into either.
- **FR-010**: The panel MUST participate in the kiosk's standard idle/attract dimming (fading to
  the same ~16% opacity as every other tab after the standard idle period) with no exemption;
  the glow/pulse animation MAY continue running underneath the dim rather than stopping outright
  (Clarifications, 2026-09-10).
- **FR-011**: Every interactive element on the panel, if any, MUST meet the 64px minimum touch
  target and 16px minimum separation rule.
- **FR-012**: All text on the panel MUST meet WCAG AA contrast minimums, the same as every other
  tab.
- **FR-013**: The glow/pulse animation MUST be implemented so it can run continuously for
  multiple days of unattended operation without degrading performance or leaking memory, and
  MUST be fully stopped and cleaned up when the visitor navigates away from the tab.
- **FR-014**: If the configuration file is missing a required value (e.g. password not yet set),
  the system MUST show a clear fallback state rather than a blank or broken panel.
- **FR-015**: The system MUST provide an on-screen control that lets an operator set or edit the
  guest network's name, password, and security type directly at the kiosk, visible whether or
  not a network is currently configured.
- **FR-016**: The editor MUST be an inline state of the same panel — no modal, no route change,
  no popup — consistent with FR-007.
- **FR-017**: The editor MUST validate the network name (1–32 characters) and, when a password is
  required, the password (8–63 characters) before saving, and MUST show a specific inline error
  next to an invalid field rather than saving invalid data or failing silently.
- **FR-018**: A saved edit MUST persist on the device it was saved on (surviving a reload or
  revisiting the tab) without any backend, network call, or code change — see Assumptions for the
  device-local scope of this persistence.
- **FR-019**: Saving MUST immediately update the displayed QR code and credentials with no page
  reload; cancelling MUST discard all changes and leave the previously displayed network
  untouched.

### Key Entities

- **Guest Network Config**: The set of values describing the guest network a visitor can join —
  network name (SSID), password, and security type (e.g. WPA2). Has two sources: a static
  in-repo default (edited by a developer and redeployed) and an optional operator-saved override
  local to one kiosk device (edited through FR-015's on-screen editor); when both exist, the
  device-local override is what the panel shows. Not tied to any individual visitor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from tapping the Guest Wi-Fi tab to their phone successfully
  joining the network in under 15 seconds using only the QR code, with zero manual typing.
- **SC-002**: The network name and password are both readable by a person of average vision from
  a normal standing viewing distance without needing to approach the screen or zoom in.
- **SC-003**: The Guest Wi-Fi panel is visually distinguishable from every other kiosk tab within
  a single glance, without reading any text, due to the animated glow washing across it.
- **SC-004**: The panel remains fully functional — glow animating, QR code scannable, text
  legible — after 72 hours of continuous unattended display, with no visual degradation,
  slowdown, or memory growth.
- **SC-005**: Updating the guest network's credentials requires either (a) using the on-screen
  editor at the kiosk, with the change visible immediately and no redeploy, or (b) editing exactly
  one configuration source in the codebase and redeploying — no other code changes required
  either way.
- **SC-006**: An operator with no prior knowledge of this feature can find the Edit control,
  enter a network name and password, and see the updated QR code within 30 seconds, without
  instructions.

## Assumptions

- The guest network is a visitor-facing, isolated network (not the kiosk's own operating
  network or any internal system), so displaying its password openly and continuously in a
  public lobby is an accepted, intentional tradeoff — consistent with the feature's explicit
  goal of making the credentials effortless to read and use. Rotating or hiding the password on
  a schedule is out of scope for this feature.
- There is exactly one guest network to advertise (not a choice between multiple networks, and
  not a separate staff/internal network); multi-network selection is out of scope.
- The guest network has no captive portal or additional sign-in step after joining — joining via
  the QR code or manually entering the credentials is sufficient to get online. If a captive
  portal exists, it is out of scope for this feature to describe or automate.
- Standard idle/session behavior (returning to the kiosk's default tab after the kiosk-wide idle
  reset) applies to this tab the same as to other passive, non-interactive tabs; no
  feature-specific session ceiling is needed since neither reading the panel nor a brief edit is
  the kind of sustained interaction the Restaurant Map's pannable/zoomable map needed one for.
- **The on-screen editor (User Story 4) is intentionally not access-controlled.** No PIN, staff
  login, or confirmation step guards it — tapping Edit is exactly as available as tapping any nav
  tab or the language toggle, matching this kiosk's existing zero-auth posture everywhere else.
  This is a deliberate tradeoff for a staffed, executive lobby kiosk, not an oversight: the worst
  case (someone changes the network to something wrong) is immediately fixable by opening the
  editor again, and adding auth would be new interaction-design surface (a keypad, a staff
  unlock flow) this request did not ask for. If the kiosk's context changes (fully public,
  unstaffed placement), revisit this.
- **A saved edit is local to one kiosk device's browser storage, not synced anywhere.** If the
  kiosk is reset, its storage cleared, or the app opened on a different device, an edit made
  through the on-screen editor does not carry over — the static `wifiConfig.static.ts` default
  is what a fresh device shows until someone edits it again (on-screen, or in the file).
  Multi-device sync is out of scope; this kiosk is a single physical unit.
