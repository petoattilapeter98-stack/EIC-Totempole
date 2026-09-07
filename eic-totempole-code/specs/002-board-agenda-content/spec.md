# Feature Specification: Board Agenda Tab Content

**Feature Branch**: `002-board-agenda-content` (implemented directly on `main`/`feat/*` branches without a dedicated feature branch)

**Created (backfilled)**: 2026-09-07

**Status**: Implemented (spec written after the fact)

**Input**: No `/speckit-specify` session produced this feature. It was built via direct prompting on top of `001-lobby-kiosk-shell`, and is documented here retroactively by `/speckit-implement` acting on a `/speckit-converge` finding (T071) that flagged real Board Agenda content as `unrequested` against 001's spec, which explicitly scoped "actual tab content" out.

## Why this exists as its own spec

`001-lobby-kiosk-shell`'s [tab-module.md](../001-lobby-kiosk-shell/contracts/tab-module.md) contract anticipated this: "Each real tab replaces its `TabPlaceholder` usage with real content in a later feature; nothing else changes." This is that later feature, for exactly one tab (Board Agenda). It does not get a `plan.md`/`tasks.md` — the implementation already shipped and is already tested (`agenda.test.ts`); writing a forward-looking plan for already-built code would be pure ceremony. This spec exists so the behavior has a traceable requirement instead of only a commit.

## User Scenario & Testing *(mandatory)*

### User Story - Guest sees what's happening right now on the board agenda (Priority: P1, additive to 001)

A visitor opens the Board Agenda tab and sees the actual day's schedule — not a placeholder — with the current session clearly marked as live and the next one flagged, so a glance tells them exactly where the event stands without asking staff.

**Independent Test**: Open Board Agenda at various times of day (mocking the wall clock) and confirm: the session whose start/end window contains the current time is marked live ("Now"), the first session after it is marked "Up next", earlier sessions read as ended, and later ones read as plain upcoming.

**Acceptance Scenarios**:

1. **Given** the Board Agenda tab is active, **When** the current wall-clock time falls within a session's `[start, end)` window, **Then** that session is visually marked live and no other session is simultaneously marked live.
2. **Given** a session is currently live, **When** the agenda is displayed, **Then** the first session after it (by start time) is marked "Up next"; the live session itself is never also marked "Up next".
3. **Given** the current time is after a session's end time, **When** the agenda is displayed, **Then** that session is marked ended, distinct from both live and upcoming sessions.
4. **Given** the kiosk has been running for multiple days without a reload, **When** midnight passes, **Then** every session's live/ended/upcoming status is computed from time-of-day only (not a stored date), so the schedule reads correctly again the next morning with no reload or manual reset.
5. **Given** the language toggle is set to HU, **When** Board Agenda is displayed, **Then** the heading, subheading, live/next/ended/presenter labels, and every session's title/presenter/room all render in Hungarian; toggling back to EN reverts all of them.

### Edge Cases

- What happens if two sessions' windows would overlap? Not handled — session data is assumed non-overlapping; the live-session determination does not defend against malformed input, consistent with `agenda.static.ts` being hand-authored, trusted data.
- What happens if there are more sessions than fit legibly in the fixed content region? `MAX_VISIBLE_SESSIONS` (currently 5) caps how many are rendered, per Constitution Principle II (no scroll, no unbounded content) — see Requirements below.
- What happens before the first session starts or after the last one ends? All sessions read as upcoming (before the first) or ended (after the last); no session is marked live, and no "Up next" badge is shown once every session has been passed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Board Agenda tab MUST render real session data (a labeled day, and a list of sessions each with start/end time, title, presenter and room) instead of the generic per-tab placeholder used by the other three tabs.
- **FR-002**: Each session's displayed status (live / ended / upcoming) MUST be computed by comparing the current wall-clock time-of-day against the session's `[start, end)` window, never against a stored calendar date, so the schedule remains correct for the kiosk's multi-day unattended runtime (Constitution Principle V).
- **FR-003**: Exactly the first non-started session (if any) MUST be marked "Up next"; a currently-live session MUST NOT also be marked "Up next".
- **FR-004**: The number of sessions rendered MUST be capped (`MAX_VISIBLE_SESSIONS`) so the tab never overflows or requires scrolling within the fixed content region (Constitution Principle II, spec 001 FR-020); a longer real agenda MUST be paginated or grouped rather than raising this cap unboundedly.
- **FR-005**: All Board Agenda text (heading, subheading, status labels, and every session's title/presenter/room) MUST render in the currently selected language (EN/HU), consistent with 001's FR-007, sourced from this tab's own string/data modules rather than the shared shell string map (Constitution Principle IX — the tab stays self-contained and removable).
- **FR-006**: Session category coloring MUST use the existing `AccentName` tokens for identity only, never as the sole carrier of status meaning (live/ended/upcoming must also be conveyed through text/iconography), consistent with 001's accessibility contract.

### Key Entities

- **Agenda Session**: One scheduled item — id, start/end wall-clock time, localized title/presenter/room, and an accent color for category identity.
- **Session Status**: Derived, not stored — `'past' | 'live' | 'upcoming'`, computed fresh from the session window and the current time on every render.
- **Agenda Day**: A localized label plus the ordered list of sessions for the day currently configured.

## Success Criteria *(mandatory)*

- **SC-001**: At any wall-clock time during the configured day, at most one session is marked live, and the live/ended/upcoming status of every session matches its start/end window with no manual date logic involved.
- **SC-002**: The Board Agenda tab never causes the shell to scroll, at any session count up to `MAX_VISIBLE_SESSIONS`, verified the same way as 001's SC-004.
- **SC-003**: Switching the language toggle changes 100% of Board Agenda's visible text (heading, labels, and all session fields) to the corresponding language, verified against a checklist of every such text element — the same bar as 001's SC-009, scoped to this tab.

## Assumptions

- Session data (`agenda.static.ts`) is static, hand-authored, trusted content — there is no ingestion, validation, or network fetch of agenda data in this feature, consistent with 001's "no network calls" constraint.
- The single configured day's sessions are assumed non-overlapping and pre-sorted by start time; nothing in this feature detects or corrects malformed input.
- `MAX_VISIBLE_SESSIONS = 5` is a tunable value tied to what fits legibly in the fixed content region at the kiosk's 1920×1280 viewport, not a hard product requirement.
