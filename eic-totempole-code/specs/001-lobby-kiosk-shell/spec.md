# Feature Specification: Lobby Kiosk Shell

**Feature Branch**: `001-lobby-kiosk-shell`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Build the base landing page shell for a corporate lobby kiosk that welcomes board members and client visitors to Teksystem Budapest. A visual reference mockup is at design\reference\interactive_lobby_dashboard.html, used only for layout structure/proportions, color values/type scale, copy/labels, and interaction behaviour — not for implementation. Scope is the persistent shell only (header bar, hero banner, navigation bar with four tabs, a content region rendering a placeholder per tab, and idle auto-reset behaviour). Out of scope: actual tab content and any network calls."

## Clarifications

### Session 2026-09-04

- Q: When a visitor switches the language toggle to HU, should the kiosk's own shell text (welcome headline, nav tab labels, event pill, footer copy) actually translate into Hungarian, or does the toggle just change its own displayed state for now? → A: Translate the shell copy — toggling EN/HU swaps the header, hero, nav-tab labels, and footer text between English and Hungarian. Per-tab placeholder content stays untranslated either way since that's out of scope for this feature.
- Q: What should the content region show as its placeholder for each of the four tabs? → A: Distinct per tab — each tab shows its own placeholder text naming that tab, so switching tabs is verifiable from the content alone, not just the nav styling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest sees a live, welcoming kiosk on arrival (Priority: P1)

A board member or client visitor walks up to the kiosk in the Teksystem Budapest lobby. Without touching anything, they can immediately see where they are (branding), that the system is live (pulsing status indicator), what time and day it is, the local weather, and a welcoming headline naming the event they're attending.

**Why this priority**: This is the baseline experience every single visitor has, even one who never touches the screen. If this doesn't work, the kiosk fails its core purpose of making a strong, trustworthy first impression. It's also independently demonstrable with zero interaction.

**Independent Test**: Load the kiosk shell and, without any touch input, observe the header (branding, pulsing status dot, clock ticking every second, current date, Budapest weather, language toggle showing a default state) and the hero banner (event pill, welcome headline, animated decorative graphic). All of it must be correct and updating with no interaction required.

**Acceptance Scenarios**:

1. **Given** the kiosk shell has just loaded, **When** no interaction has occurred, **Then** the header shows the "Teksystem Budapest" brand name, a status indicator that visibly pulses, a clock showing the current time, today's date, and a Budapest weather reading (temperature + condition).
2. **Given** the kiosk shell is displayed, **When** one real second elapses, **Then** the displayed clock advances by exactly one second without any page reload or flicker.
3. **Given** the kiosk shell is displayed, **When** the visitor looks at the hero banner, **Then** they see an event pill naming the current event, a large welcome headline addressing guests, and a decorative geometric graphic that is gently and continuously moving.

---

### User Story 2 - Guest browses shell sections via the navigation tabs (Priority: P2)

A visitor wants to find their way around: they tap through the four navigation tabs (Board Agenda, Local Transit, Company Highlights, Guest Wi-Fi) to see what's available, even though the real content isn't built yet in this feature.

**Why this priority**: Navigation is the primary way visitors interact with the kiosk once they've noticed it. It must work reliably and predictably before any tab's real content can be layered in by later features.

**Independent Test**: With the shell loaded, tap each of the four tabs in turn and confirm the tapped tab becomes the visually distinct "active" one, exactly one tab is active at any time, and the content region directly below updates in place to that tab's placeholder — with no navigation away from the page and no page scrolling introduced.

**Acceptance Scenarios**:

1. **Given** the kiosk shell is displayed with Board Agenda active by default, **When** the visitor taps "Local Transit", **Then** Local Transit becomes visually distinct as active, Board Agenda returns to its inactive appearance, and the content region below immediately shows the Local Transit placeholder.
2. **Given** any tab is currently active, **When** the visitor taps a different tab, **Then** exactly one tab is active at all times — never zero, never more than one.
3. **Given** the visitor switches between tabs repeatedly, **When** any tab's placeholder is shown, **Then** the content region fills all remaining vertical space below the navigation bar and the page never scrolls vertically, regardless of which tab is active.

---

### User Story 3 - Idle kiosk resets itself automatically (Priority: P3)

After a visitor (or the last of a group) walks away, the kiosk is unattended. It must not get stuck showing whatever the last visitor left on screen — it counts down visibly and returns itself to the default welcoming state for the next visitor, without needing staff to intervene.

**Why this priority**: This protects visitor privacy (nothing left behind from the previous visitor), keeps the kiosk presentable for the next arrival, and is core to the "unattended operation" requirement of a public lobby kiosk. It depends on tab navigation existing (P2) to have something meaningful to reset.

**Independent Test**: Let the kiosk sit untouched and confirm the visible countdown in the footer ticks down every second; touch/click anywhere and confirm it jumps back to its full starting value; let it reach zero and confirm the kiosk returns to the Board Agenda tab with any in-progress state cleared.

**Acceptance Scenarios**:

1. **Given** the kiosk shell is displayed, **When** no touch or click occurs, **Then** the footer's countdown visibly decreases by one every second.
2. **Given** the countdown is at any value above zero, **When** the visitor touches or clicks anywhere on the screen, **Then** the countdown immediately resets to its full starting duration.
3. **Given** the visitor has switched to a tab other than Board Agenda and the countdown reaches zero with no further interaction, **When** the reset fires, **Then** the active tab returns to Board Agenda, any entered data is cleared, and any in-progress interaction state is reset to its default.

---

### User Story 4 - Guest switches the display language (Priority: P4)

A Hungarian-speaking visitor prefers to read the kiosk in Hungarian rather than English, so they use the language toggle in the header to switch, and it stays switched while they keep using the kiosk.

**Why this priority**: Important for accessibility to local visitors, but the shell is fully usable and demonstrable in its default language without this, so it's the least critical of the four stories for an initial MVP slice.

**Independent Test**: Tap the language toggle and confirm the header, hero, navigation tab labels, and footer text all switch between English and Hungarian, and the toggle itself visibly reflects the current selection; switch tabs and confirm the selected language is still showing (it doesn't silently revert), while per-tab placeholder text remains unaffected by the language selection.

**Acceptance Scenarios**:

1. **Given** the language toggle shows its default (EN) state, **When** the visitor taps it, **Then** the header, hero headline and event pill, navigation tab labels, and footer text all switch to their Hungarian equivalents, and the toggle visibly reflects the new selection.
2. **Given** the language toggle has been switched to HU, **When** the visitor navigates between tabs, **Then** the toggle continues to show HU, and the shell's header, hero, nav-label, and footer text remain in Hungarian.

---

### Edge Cases

- What happens if the countdown reaches zero at the exact moment the visitor is mid-tap on a tab or the language toggle? The reset takes effect (return to Board Agenda, clear in-progress state) since no interaction was completed before zero was reached; a completed tap immediately before zero resets the countdown instead and the reset does not fire.
- What happens if the visitor rapidly taps multiple different tabs in quick succession? Only the most recently tapped tab ends up active; the content region always reflects the last selection, never an intermediate one.
- What happens to the clock and countdown when the underlying device's calendar date rolls over (midnight)? The displayed date updates to the new day automatically at the next scheduled clock update, with no visual glitch or reset of unrelated state.
- What happens if a visitor never touches the kiosk at all? The countdown still ticks down and fires the same reset behavior as if a tab had been changed; since Board Agenda is already the default and active, this reset is a no-op from the visitor's point of view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST display the brand name "Teksystem Budapest" alongside a status indicator that visibly and continuously pulses to signal the kiosk is live.
- **FR-002**: The header MUST display a clock showing the current time, accurate to the second, updating automatically every second without a page reload.
- **FR-003**: The header MUST display the current date alongside the clock.
- **FR-004**: The header MUST display local weather for Budapest, showing a temperature value and a condition label.
- **FR-005**: The header MUST provide a language toggle control that switches between an EN state and an HU state.
- **FR-006**: The selected language state MUST persist across tab switches and MUST NOT revert on its own while the kiosk session continues.
- **FR-007**: The header, hero banner (including the event pill and welcome headline), navigation tab labels, and footer text MUST render in the currently selected language — Hungarian when HU is selected, English when EN is selected. Per-tab placeholder content in the content region is not required to translate (see FR-014).
- **FR-008**: The hero banner MUST display a pill-shaped tag naming the current event.
- **FR-009**: The hero banner MUST display a large welcome headline addressing visiting guests.
- **FR-010**: The hero banner MUST display a decorative geometric graphic with gentle, continuous motion; this graphic is decorative only and is not an interactive control.
- **FR-011**: The navigation bar MUST display exactly four tabs, in a single line, in this order: Board Agenda, Local Transit, Company Highlights, Guest Wi-Fi — each with an icon and a short text label.
- **FR-012**: Exactly one navigation tab MUST be marked active at any given time, and the active tab MUST be visually distinct from the three inactive tabs.
- **FR-013**: Selecting a navigation tab MUST update the content region directly below it inline, in place, with no page navigation and no full-page reload.
- **FR-014**: The content region MUST render a placeholder unique to the active tab (e.g., naming that tab) so the displayed content alone identifies which tab is active, independent of nav styling. Real per-tab content is out of scope for this feature, and this placeholder text is not required to translate with the language toggle (see FR-007).
- **FR-015**: Board Agenda MUST be the default active tab when the kiosk shell first loads.
- **FR-016**: The content region MUST occupy all remaining vertical space below the navigation bar, and the page MUST NOT scroll vertically regardless of which tab's placeholder is shown.
- **FR-017**: The footer MUST display a visible, continuously updating countdown showing the whole seconds remaining until the kiosk auto-resets.
- **FR-018**: Any touch or click anywhere on the kiosk shell MUST immediately reset the countdown to its full starting duration.
- **FR-019**: When the countdown reaches zero, the kiosk MUST return the active tab to Board Agenda, clear any data the visitor entered, and reset any other in-progress interaction state to its default.
- **FR-020**: The entire kiosk shell (header, hero, navigation bar, content region, footer) MUST fit within the fixed kiosk viewport with no vertical scrolling, in every tab state.
- **FR-021**: All interactive elements in the shell (language toggle, navigation tabs) MUST meet the kiosk's minimum touch target size and minimum spacing between adjacent targets.
- **FR-022**: The kiosk shell MUST NOT make any network calls in this feature; weather, event, and other displayed values are static/placeholder data for this feature.

### Key Entities

- **Navigation Tab**: One of the four persistent sections a visitor can select (Board Agenda, Local Transit, Company Highlights, Guest Wi-Fi). Has a label, an icon, and an active/inactive state; exactly one is active at a time.
- **Idle Countdown**: The auto-reset timer shown in the footer. Has a remaining-seconds value that counts down, and a full starting duration it resets to on interaction or after firing.
- **Language Preference**: The visitor-facing display language state (EN or HU) selected via the header toggle; persists across tab switches within the current kiosk session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can identify the venue branding, the current time, and today's date within 3 seconds of looking at the kiosk, without touching it.
- **SC-002**: The on-screen clock never drifts from real time by more than one second during continuous display.
- **SC-003**: Tapping any of the four navigation tabs updates the active tab and its content region with no perceptible delay, and exactly one tab is visually active at all times, across 100% of tap sequences tested.
- **SC-004**: The kiosk shell renders with zero vertical (or horizontal) page scrolling in all four tab states, verified on the target kiosk display.
- **SC-005**: An idle kiosk with no touch input automatically returns to the Board Agenda tab and clears any in-progress state within one countdown cycle of the last interaction, with no staff intervention required.
- **SC-006**: Touching or clicking anywhere on the kiosk while the countdown is running resets it to its full duration in 100% of observed cases.
- **SC-007**: The kiosk shell remains fully functional (clock ticking, countdown running, tabs switchable) after continuous display for at least 72 hours, with no manual reload.
- **SC-008**: Every interactive element in the shell meets the kiosk's minimum touch target size and minimum spacing requirements, verified by measurement.
- **SC-009**: Switching the language toggle changes 100% of the header, hero, navigation-tab-label, and footer text to the corresponding language, verified against a checklist of every such text element on screen.

## Assumptions

- The idle auto-reset countdown starts at 60 seconds, matching the reference mockup's behavior; the exact duration is a tunable value, not a hard product requirement, and can be adjusted later without a spec change.
- Weather and event-name values are static placeholder data for this feature, consistent with "no network calls" being out of scope; live data integration (e.g., a weather service, an events calendar) is a future feature.
- The four navigation tabs explicitly listed in this spec's Navigation bar section (Board Agenda, Local Transit, Company Highlights, Guest Wi-Fi) are the complete scope of this feature's navigation. The reference mockup additionally shows "Campus Map" and "Express Check-In" tabs; those are not part of this feature and are not built here.
- "Board members" and "client visitors" are treated as a single, undifferentiated visitor persona for this shell — there is no login, identity, or role-based content differentiation in this feature.
- The Language Preference is a display setting, not visitor-entered data; it is therefore not cleared by the idle auto-reset in FR-019, and continues to reflect the visitor's last choice after a reset back to Board Agenda.
- Hungarian copy for the header, hero, nav labels, and footer is authored as static EN/HU text pairs baked into the shell itself; no translation service or backend call is used, consistent with "no network calls" being out of scope. Per-tab placeholder text in the content region is not translated in this feature and may continue to reference the tab's English label regardless of the selected language, since real (and potentially localized) tab content is future scope.
- The kiosk shell targets the fixed kiosk viewport and touch-only interaction model established for this project (no scrolling, no hover-dependent affordances, minimum touch target sizing) rather than a general responsive range.
- This feature covers the persistent shell only; the six illustrative panels in the reference mockup (map, check-in, agenda, transit, highlights, wi-fi) map only loosely to this feature's four tabs and placeholders — actual tab content for any tab is explicitly out of scope here.
