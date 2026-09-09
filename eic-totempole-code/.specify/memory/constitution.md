<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Rationale: MINOR — materially expands existing guidance on Principle IV with a new,
narrowly-scoped exception, rather than removing or redefining the principle's core
guarantee (no route changes, no modals, no popups for application content all still
hold). Triggered by feature 003 (voice-info-agent): its Copilot Studio agent is now
published requiring Microsoft/Entra sign-in, and Microsoft's login page refuses to
render inside an iframe (verified: it cannot be embedded), making inline
authentication technically impossible, not merely undesirable.

Modified principles:
  - IV. Single-Page, Inline-Only Updates — added a "Narrow exception — unavoidable
    third-party identity sign-in" subsection permitting a user-initiated popup solely
    to complete sign-in with a provider whose login page cannot be iframed, with
    explicit guardrails (user-gesture-only, sign-in-only, must document the provider
    and technical reason in plan.md, no extension to other interactions).

Added sections: none (subsection added within existing Principle IV)

Removed sections: none

Deferred / TODO placeholders: none

Templates requiring follow-up review (not modified by this command; flagged for the
next command in the workflow that touches them):
  - .specify/templates/plan-template.md — Constitution Check section for any future
    feature touching Principle IV should note whether this popup exception applies and,
    if so, cite the specific provider/technical reason per the exception's requirement.
-->

# EIC Totempole Kiosk Constitution

## Core Principles

### I. Kiosk-First Hardware Target
The application targets exactly one device configuration: a 50-inch Microsoft Surface
Hub 2S at 3840x2560 native resolution, 3:2 aspect ratio, running at 200% OS scaling,
which yields a design viewport of 1920x1280 CSS pixels. All layout, typography, and
interaction design MUST be built and verified against this viewport — not against
generic responsive breakpoints. Input is touch-only: the UI MUST NOT rely on
`:hover` states to reveal information or affordances, MUST NOT use right-click /
context-menu interactions, and MUST NOT require a hardware keyboard for any action.
The only exception is on-screen (virtual) keyboard input surfaced by explicit
on-screen forms (e.g., a name-entry field), which MUST use touch-appropriate input
controls.
**Rationale**: A kiosk has one physical instance, one input modality, and one
operator (the public). Designing for a range of devices or input types adds
complexity the product will never use and risks a broken experience on the one
screen that matters.

### II. Fixed 3:2 Viewport, No Vertical Scroll
Every screen state MUST fill the 1920x1280 viewport exactly and MUST NOT produce
vertical (or horizontal) scrolling under any content state. Content MUST adapt to
the available height — via reflow, truncation, pagination, or dynamic
sizing — rather than overflowing it. Any feature whose content volume is unbounded
or user-controlled (e.g., a list, a feed) MUST define an explicit strategy for
staying within the fixed viewport (capping, cycling, or scaling) before it ships.
**Rationale**: A public lobby display has no scrollbar affordance a passer-by will
discover, and any overflow is simply invisible content — a silent failure mode
that scrolling-web assumptions do not protect against.

### III. Minimum Touch Target Sizing
Every interactive element MUST have a touch target of at least 64x64 CSS pixels,
and adjacent interactive elements MUST maintain at least 16px of separation between
their touch targets. This applies to the visual/hit-testing target, not merely the
visible icon or label — padding MUST be added where the visual asset is smaller.
**Rationale**: Touch accuracy on a large wall-mounted display, often used at an
angle or by users unfamiliar with the interface, is materially worse than on a
handheld device; undersized or crowded targets produce mis-taps that read as a
broken kiosk.

### IV. Single-Page, Inline-Only Updates
The application is a single page: there are no client-side route changes, no
modal dialogs, and no popups (including native browser dialogs such as `alert`,
`confirm`, or `window.open`). All state transitions and content updates MUST
happen inline within the existing layout. A feature that would naturally want a
modal or a separate route MUST instead be designed as an inline panel, overlay
section, or state change within the single page.
**Rationale**: Modals and route changes assume a user who can dismiss, navigate
back, or get lost — none of which apply to an unattended public kiosk, where the
only recoverable state is "the one page, in a known layout."

**Narrow exception — unavoidable third-party identity sign-in**: A feature MAY
open a popup window strictly to complete a sign-in flow with a third-party
identity provider (e.g. Microsoft/Entra ID) when, and only when, that provider's
own login page technically refuses to render inside an iframe (e.g. it sends
`X-Frame-Options`/`frame-ancestors` denying embedding) — a fact verified by
inspection, not assumed. This exception covers only the sign-in step itself:
- The popup MUST be triggered by an explicit visitor/operator action (a click),
  never opened automatically without one.
- The popup MUST be used solely to establish or refresh a sign-in session; it
  MUST NOT be used to display ordinary application content, navigation, or any
  content this application itself controls.
- The feature MUST otherwise still satisfy every other constraint in this
  principle (single page, no route changes, no other modals) and every other
  Core Principle (touch targets, no-scroll, reliability, etc.) for everything
  outside that one popup.
- The feature's plan.md MUST record which provider requires this, the specific
  technical reason (e.g. the observed frame-blocking header/behavior), and MUST
  NOT extend the exception to any other interaction "for convenience."
**Rationale**: Some identity providers make inline authentication technically
impossible, not merely undesirable, precisely to prevent clickjacking of their
login page. Refusing to ever allow a popup would make such providers entirely
unusable from this kiosk, which is a worse outcome than a narrowly-scoped,
user-initiated exception that changes nothing about the rest of the principle.

### V. Unattended Multi-Day Reliability
The application MUST run continuously for multiple days without a page reload.
Every `setTimeout`/`setInterval` timer, every subscription (WebSocket, event
listener, polling loop, observer), and every other long-lived resource MUST be
torn down when the owning component or module unmounts, and MUST NOT be
re-created without first clearing the prior instance. Application state MUST NOT
grow unboundedly over time (e.g., ever-appending logs, caches, or lists held in
memory) — any accumulating collection MUST have an explicit cap or eviction
strategy.
**Rationale**: There is no operator to notice a memory leak or a stacked interval
and refresh the tab; degradation only becomes visible as a public-facing failure
after days of unattended runtime, by which point the cause is hard to trace.

### VI. Zero Secrets in the Client Bundle
No API key, credential, token, or other secret MAY be present in client-shipped
code, configuration, or environment variables bundled into the frontend. Any
feature that requires an authenticated call to a third-party or internal service
MUST proxy that call through a backend endpoint that holds the credential
server-side. This applies equally to build-time inlined env vars and to
runtime-fetched config.
**Rationale**: A kiosk is a public, physically accessible, always-on device;
anything shipped to the client can be extracted by inspecting network traffic or
bundle contents, so the client MUST be treated as fully untrusted for credential
purposes.

### VII. Accessibility Baseline Despite Touch-First Design
All text and meaningful UI elements MUST meet WCAG AA contrast minimums. Every
interactive element MUST be reachable via keyboard focus order and MUST carry a
screen-reader label (accessible name/role), even though the primary and expected
input is touch. Accessibility MUST NOT be treated as a touch-only exemption.
**Rationale**: Keyboard and screen-reader support cost little when built in from
the start, keep the app usable for assistive-technology users and edge-case
hardware, and act as a forcing function for clean, semantic markup that also
benefits touch interaction.

### VIII. Static-First Delivery
Any feature or content that can be served as a static asset (pre-built HTML/CSS/
JS, images, pre-rendered data) MUST be served that way rather than generated
dynamically at request time or fetched from a running backend service. Dynamic
backend endpoints are reserved for functionality that genuinely requires
server-side state, computation, or credential handling (see Principle VI).
**Rationale**: Static assets are simpler to host reliably, cache, and keep
running unattended for days; every dynamic dependency is an additional runtime
failure mode on a device nobody is watching.

### IX. Modular Feature Isolation
Every feature MUST be built as an isolated module with a well-defined boundary,
such that it can be disabled or removed entirely without modifying or breaking
any other feature. Features MUST NOT reach into another feature's internal state,
DOM, or storage keys; shared capability MUST be factored into a common module
that features depend on explicitly, not accessed through cross-feature coupling.
**Rationale**: A kiosk accumulates features over its lifetime (promotions,
directories, check-in flows, ambient content); without enforced isolation, a
single bad feature (or its removal) risks taking down the whole unattended
display.

## Platform & Environment Constraints

- **Target device**: Microsoft Surface Hub 2S, 50-inch, 3840x2560 native
  resolution, 3:2 aspect ratio, 200% OS display scaling.
- **Design/CSS viewport**: 1920x1280 CSS pixels. Build and test against this
  exact viewport; do not design for a responsive range.
- **Input**: touch-only in production. Mouse/keyboard may be used for local
  development but MUST NOT be assumed by the shipped UI (no hover-revealed
  content, no right-click menus, no keyboard shortcuts required for core flows).
- **Runtime lifespan**: the app is expected to stay open and unattended for
  multiple days between reloads/deploys.

## Quality Gates & Development Workflow

- **PR/change review** MUST verify each changed or new feature against Principles
  I–IX explicitly; a reviewer who cannot confirm compliance MUST request the
  missing evidence (viewport screenshot, touch-target measurements, timer
  cleanup diff, etc.) before approving.
- **Viewport verification**: UI changes MUST be checked at the 1920x1280 CSS
  viewport with no scroll under representative content, including
  worst-case/longest content states.
- **Touch target audit**: new or changed interactive elements MUST be checked
  against the 64px minimum / 16px separation rule before merge.
- **Lifecycle audit**: any change introducing a timer, interval, subscription,
  or listener MUST show the corresponding cleanup path in the same change.
- **Secret scan**: any change touching build config, env vars, or third-party
  API calls MUST be checked for client-side secret exposure before merge.
- **Removability check**: a new feature MUST be reviewed for whether it can be
  disabled/removed without code changes elsewhere; cross-feature coupling found
  during review MUST be refactored before merge, not deferred.
- **Popup-exception audit**: any change that opens a popup under Principle IV's
  narrow identity sign-in exception MUST show, in its plan.md, the specific
  provider and the verified technical reason the login page cannot be iframed,
  and MUST NOT be reused to justify a popup for anything other than that sign-in
  step.

## Governance

This constitution supersedes all other project practices, style guides, and
undocumented conventions for anything it addresses. Where a proposed change
conflicts with a Core Principle, the principle wins unless the constitution
itself is amended.

**Amendment procedure**: amendments are made by editing this file, updating the
Sync Impact Report at its top, and bumping the version per the policy below.
Any amendment that changes or removes a Core Principle's guarantee MUST call out
the affected principle by name and MUST be reflected in the version bump.

**Versioning policy** (semantic versioning applied to governance):
- **MAJOR**: a Core Principle is removed or redefined in a backward-incompatible
  way (e.g., relaxing the no-scroll rule, allowing client-side secrets).
- **MINOR**: a new principle or section is added, or existing guidance is
  materially expanded.
- **PATCH**: wording clarifications, typo fixes, and non-semantic edits.

**Compliance review**: every feature change is expected to satisfy the Quality
Gates above at review time; this constitution is the reference document for
resolving disagreements about whether a design or implementation is acceptable
for this kiosk.

**Version**: 1.1.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-09
