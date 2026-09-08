# Specification Quality Checklist: Restaurant Map

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Re-validated 2026-09-08 twice** — after the first `/speckit-clarify` session (5 questions) and
again after a post-plan session (4 questions). All 16 items still pass; no item has changed state
across either pass. The spec has grown from 22 to 38 functional requirements and from 10 to 17
success criteria.

The post-plan pass mattered more than a routine re-check: it corrected **two places where the spec
promised something the plan had proved undeliverable**.

- FR-012 said an actively used map is "never" reset. Map interaction is only detectable through
  iframe focus, which does not reliably clear when a visitor leaves, so an unbounded promise would
  let one session stall the display indefinitely. FR-012 was reworded and FR-036 now sets a
  10-minute ceiling.
- FR-013 covered failure "for any other reason" and SC-005 demanded a raw provider error in "0% of
  trials". Neither is achievable: when the provider answers successfully with its own error page,
  the frame's `load` fires and the kiosk cannot tell. FR-013 was narrowed to the detectable class,
  FR-037 states the gap, and SC-005 was rescoped.

Both were caught by checking the spec against the plan's research rather than against itself — the
kind of defect a single-pass review does not surface.

Two judgment calls worth recording, since a strict reading could flag them:

1. **"Google Maps" / "Google My Maps" is now named in the Clarifications and Assumptions
   sections.** This is where a decided integration belongs, and the decision was made deliberately
   after weighing alternatives — it is driven by Constitution Principle VI (no client-side
   secrets), not by implementation preference. Every functional requirement remains written
   provider-agnostically: FR-004 says "an embedded interactive map", FR-017 says "embedded by a
   means that requires no credential", FR-016 says "this feature's dedicated custom map", and
   FR-034 says "the map provider's own branding". No requirement or success criterion names a
   vendor, so a different keyless provider would satisfy the requirement set unchanged.

2. **"1920x1280 CSS pixels" appears in FR-009, SC-003, and SC-004.** This is the kiosk's fixed
   physical device viewport, mandated by Constitution Principles I and II — a product constraint
   of the one screen this application runs on, not a framework or implementation choice. Stating
   it is what makes the no-scroll criteria verifiable.

**Resolved during clarification** (previously flagged here as open):

- FR-017, the client-side credential question, is settled: a keyless embed, so no API key and no
  server-side proxy. The application stays a purely static deployment, and Principle VI is
  satisfied without introducing a backend.

**Still open for `/speckit-plan`, not a spec defect**:

- **Constitution Principle VIII (Static-First Delivery) exception.** The embedded map is a live
  third-party dependency that cannot be pre-rendered as a static asset without losing the pan/zoom
  exploration the feature exists to provide. FR-013 through FR-015 bound the risk. If the exception
  is rejected at plan time, the offline fallback (FR-013) becomes the whole feature and User
  Story 2 is dropped.
- **Two-representation data risk.** FR-016 and FR-023 require the Google My Maps pins and the
  in-repo restaurant list to stay identical, enforced by a documented editorial procedure rather
  than by the system. The plan should decide how that parity is checked (SC-011) — a test, a build
  step, or a documented review — since nothing in the running application can detect drift.
- **Provisioning the shared custom map.** Its ownership, sharing settings, and edit access are
  feature infrastructure that must exist before implementation can be verified.
