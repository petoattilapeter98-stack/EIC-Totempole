# Feature Specification: Voice Information Assistant

**Feature Branch**: `feat/voice-info-agent`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "I want to integrate a multi-agent voice information subpage to the main screen, developing on a separate branch. This voice agent will act as an information provider to customers, answering questions regarding our innovation centre, company and employees." Amended 2026-09-09: "The agent integrated by copilot is now published with microsoft authentication. What I want to do is have a login possibility to my (or someone's) microsoft account when entering the voice-info-agent. make this a pop-up because the whole functionality is worthless without it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Someone signs in with a Microsoft account so the assistant can be used (Priority: P1)

The published assistant now requires signing in with a Microsoft account before it will answer anything. A kiosk operator (or whoever is responsible for the device) signs in once, using a shared/organizational Microsoft account, so that the assistant is usable for the visitors who come after them.

**Why this priority**: Without this, nothing else in this feature works at all — every other user story depends on a signed-in session existing. This is now the single highest-priority story, ahead of asking any question.

**Independent Test**: Open the voice information section with no prior sign-in, start the assistant, complete the Microsoft sign-in flow when prompted, and confirm the assistant becomes usable afterward without needing to sign in again for the rest of the day's visitors.

**Acceptance Scenarios**:

1. **Given** the assistant has not been signed in yet, **When** someone starts the assistant, **Then** it clearly indicates that signing in with a Microsoft account is required before it can help.
2. **Given** sign-in is required, **When** the operator taps the sign-in control, **Then** a popup window opens to complete the Microsoft sign-in — this is the one deliberate, narrowly-scoped exception to this kiosk's normal no-popup design (Constitution Principle IV's identity sign-in exception), used because Microsoft's own sign-in page cannot be rendered inline.
3. **Given** the operator completes sign-in successfully in the popup, **When** the popup closes, **Then** the assistant becomes usable and answers questions normally, without the kiosk navigating away from its single page.
4. **Given** the assistant has already been signed in, **When** a new visitor starts a fresh conversation later the same day, **Then** they are not asked to sign in again — the session from step 3 is still valid.
5. **Given** the sign-in popup is closed or cancelled without completing sign-in, **When** the visitor looks at the section afterward, **Then** it still clearly shows that sign-in is needed and offers a way to try again, rather than looking stuck or broken.

---

### User Story 2 - Visitor asks about the Innovation Centre by voice (Priority: P2)

A visitor at the kiosk wants to understand what the Innovation Centre is, what happens there, and what facilities or programs it hosts. Instead of hunting through tabs, they open the voice information section, ask their question out loud, and get a direct answer without needing staff.

**Why this priority**: This is the core reason the feature exists — turning the kiosk from a static display into something a visitor can actually ask questions of. It's the smallest slice that proves the assistant works end-to-end (listening, understanding, answering) and is independently valuable even before company or employee topics are added. Depends on User Story 1 — the assistant must already be signed in.

**Independent Test**: With sign-in already completed, open the voice information section, ask a question clearly about the Innovation Centre (e.g., "What is this Innovation Centre for?"), and confirm a relevant, accurate answer is delivered back to the visitor without leaving the single kiosk page.

**Acceptance Scenarios**:

1. **Given** the voice information section is open and idle, **When** the visitor asks a question about the Innovation Centre, **Then** the assistant delivers a relevant, accurate answer without navigating away from the kiosk's single page or opening a popup.
2. **Given** the assistant has just answered a question, **When** the visitor asks a related follow-up question, **Then** the assistant answers the follow-up without the visitor needing to restart or reopen the section.
3. **Given** the visitor asks a question with no clear answer in the Innovation Centre knowledge content, **When** the assistant responds, **Then** it clearly says it cannot help with that question instead of guessing or fabricating an answer.

---

### User Story 3 - Visitor asks about the company (Priority: P3)

A visitor wants to know about the company behind the Innovation Centre — its history, mission, services, or where else it operates — and asks the voice assistant directly rather than searching the kiosk's other tabs.

**Why this priority**: Company information is a natural second topic once the assistant works at all, but the kiosk still has value with only Innovation Centre answers (P2), so this is additive rather than blocking.

**Independent Test**: Ask a company-related question (e.g., "What does this company do?") and confirm the assistant answers correctly and distinctly from an Innovation Centre answer, without the visitor needing to select a topic or mode first.

**Acceptance Scenarios**:

1. **Given** the voice information section is open, **When** the visitor asks a question about the company, **Then** the assistant answers using company information without requiring the visitor to specify which topic they mean.
2. **Given** the visitor alternates between an Innovation Centre question and a company question in the same session, **When** each question is asked, **Then** each is answered correctly for its own topic without the assistant mixing up the two.

---

### User Story 4 - Visitor asks about employees (Priority: P4)

A visitor wants to know about the people who work at the Innovation Centre or company — for example, who leads a particular team — and asks the voice assistant.

**Why this priority**: Useful and requested, but scoped narrowly to publicly approved information (see Clarifications), and the assistant delivers meaningful value via P2/P3 even before employee questions are supported.

**Independent Test**: Ask an in-scope employee-related question (e.g., "Who leads the engineering team?") and confirm the assistant answers using only approved, publicly shareable information, and declines cleanly for anything outside that approved scope.

**Acceptance Scenarios**:

1. **Given** the voice information section is open, **When** the visitor asks an in-scope employee question, **Then** the assistant answers using only the approved public information for that person or team.
2. **Given** the visitor asks for information about an employee that is not part of the approved public dataset (e.g., personal/private details), **When** the assistant responds, **Then** it declines to answer that part of the question and does not disclose or invent unapproved information.

---

### User Story 5 - Visitor discovers and cleanly exits the voice section (Priority: P5)

A visitor isn't sure what to ask, or wants to stop using the voice assistant and return to browsing the kiosk normally. They see example questions to get started, and can end the conversation at any time without confusion.

**Why this priority**: Improves discoverability and closes the interaction loop, but the assistant already delivers its core value (P2-P4) without this; it mainly reduces visitor confusion and staff interruptions.

**Independent Test**: Open the section with no prior interaction and confirm example prompts are visible; then end the session and confirm the kiosk returns cleanly to its prior state inline, with no popup or page transition.

**Acceptance Scenarios**:

1. **Given** the voice information section has just been opened and no question has been asked yet, **When** the visitor looks at the section, **Then** they see example questions covering all three supported topics (Innovation Centre, company, employees).
2. **Given** a conversation is in progress or has just finished, **When** the visitor chooses to end the interaction, **Then** the kiosk returns inline to its previous state with no confirmation modal, no popup, and no page navigation.

---

### Edge Cases

- What happens if the visitor/operator closes or cancels the Microsoft sign-in popup without completing it? The section MUST return to a state that still clearly shows sign-in is needed and MUST offer a way to try again, rather than looking stuck or silently broken.
- What happens if the browser blocks the sign-in popup outright (pop-up blocker)? The section MUST show a clear message that a popup needs to be allowed to sign in, rather than doing nothing visibly.
- What happens if the signed-in session expires while visitors are still using the kiosk during the day? The next conversation MUST prompt sign-in again the same way as the first time, without leaving the kiosk in a confusing state beyond the normal "couldn't get an answer" fallback (see below).
- What happens when the visitor is silent or speaks too quietly for the microphone to pick up anything? The assistant MUST show a clear "didn't catch that" style response and let the visitor try again without restarting the section.
- What happens when background noise in the lobby (other conversations, ambient sound) interferes with recognition? The assistant MUST treat a misheard or garbled question the same as an unclear question — asking the visitor to repeat rather than answering based on a guess.
- What happens when the voice/AI backend service is temporarily unavailable or times out? The section MUST show a clear, friendly unavailable message and MUST NOT leave the visitor staring at a stuck "listening" or "thinking" state indefinitely.
- What happens if the visitor asks something entirely outside all three supported domains (e.g., unrelated small talk, or a question the shell's header already answers like the weather)? The assistant MUST say it cannot help with that and, where relevant, MUST NOT duplicate or contradict information already shown elsewhere on the kiosk shell.
- What happens if the kiosk's existing idle auto-reset fires while a conversation is in progress? Per FR-011/FR-012 below, genuine listening/response activity counts as interaction and prevents reset; if the visitor has stopped interacting long enough for the countdown to legitimately reach zero, the conversation MUST be cleared the same way other in-progress state is cleared today — but the sign-in session itself MUST NOT be cleared (FR-021).
- What happens if a visitor's answer text is too long to fit the fixed viewport? Per FR-006, the response MUST truncate, summarize, or paginate rather than overflow or introduce scrolling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kiosk MUST provide a dedicated voice information section reachable from the main kiosk screen, presented inline within the existing single page — MUST NOT open as a modal, popup, or separate route (Constitution Principle IV), except for the one narrowly-scoped sign-in popup described in FR-020.
- **FR-002**: The section MUST accept spoken natural-language questions from a visitor via the kiosk's microphone.
- **FR-003**: The assistant MUST be able to answer questions across three knowledge domains: (a) the Innovation Centre — what it is, its purpose, facilities, and hosted events/programs; (b) the company — history, mission, and services; and (c) employees, limited to a curated set of approved employee profiles (team leads plus a small set of highlighted staff bios — see Clarifications Q1); it MUST NOT disclose live HR data, contact details, or any employee not in that approved set.
- **FR-004**: The visitor MUST start and stop listening via a push-to-talk control they tap/hold to talk and release or tap again to stop (Clarifications Q2); no wake-word or always-on listening is used. This control MUST meet the kiosk's minimum touch target sizing and spacing (Constitution Principle III).
- **FR-005**: The assistant MUST deliver its answer as spoken audio (text-to-speech) together with simultaneous on-screen captions/transcript of that same answer (Clarifications Q3).
- **FR-006**: Any on-screen text shown for a response (caption, transcript, or text-only answer) MUST render within the fixed kiosk viewport without introducing scrolling, truncating or summarizing gracefully when an answer would otherwise overflow (Constitution Principle II).
- **FR-007**: The visitor MUST be able to ask a follow-up question within the same open session without closing and reopening the section.
- **FR-008**: The visitor MUST be able to end the voice interaction at any time and return inline to the kiosk's prior state, with no confirmation modal and no page navigation.
- **FR-009**: When a question falls outside the three supported domains, or asks for employee information outside the approved public dataset, the assistant MUST clearly state it cannot help with that part of the question rather than fabricating or guessing an answer.
- **FR-010**: When no speech is detected, speech cannot be understood, or the voice/AI backend is unavailable, the section MUST show a clear fallback message and let the visitor retry without restarting the kiosk shell.
- **FR-011**: Active use of the voice section (listening for or receiving an answer to a question) MUST count as visitor interaction for the kiosk's existing idle countdown (spec 001 FR-018), so a conversation in progress is not interrupted by an unrelated auto-reset.
- **FR-012**: Any conversation audio, transcript, or generated answer MUST be discarded when the kiosk's idle auto-reset fires (spec 001 FR-019) or when the visitor explicitly ends the session, so no visitor's conversation remains visible or audible to the next visitor. This clearing MUST NOT sign the assistant out (see FR-021).
- **FR-013**: Any credential or API key required to call underlying speech-recognition, knowledge-lookup, or answer-generation services MUST be held and used server-side only; the kiosk client MUST NOT embed, expose, or transmit such secrets (Constitution Principle VI).
- **FR-014**: The voice information section MUST be built as an isolated module that can be disabled or removed without modifying the shell or any other kiosk tab (Constitution Principle IX).
- **FR-015**: The voice information section MUST support both of the kiosk's existing display languages (EN/HU), following the visitor's current language selection from the shell's language toggle (spec 001 FR-007).
- **FR-016**: When first opened with no prior question asked, the section MUST display example questions covering all three supported domains, to help visitors who don't know what to ask.
- **FR-017**: Any microphone connection, audio stream, or timer used by the voice section MUST be released or stopped when a conversation ends or the section becomes inactive, and MUST NOT be re-created without first releasing the prior instance (Constitution Principle V).
- **FR-018**: The assistant's answers MUST be drawn from an approved, maintained set of Innovation Centre, company, and employee content rather than open-ended, unreviewed lookup, so answers stay accurate and on-brand.
- **FR-019**: The assistant MAY require signing in with a Microsoft account before it will answer any question; when it does, the section MUST clearly indicate that sign-in is required rather than appearing broken, stuck, or silently unresponsive.
- **FR-020**: Completing sign-in MUST use a popup window, triggered only by an explicit tap on a visible sign-in control — never opened automatically without that action. This is the sole exception to FR-001's no-popup rule, used because the identity provider's own sign-in page is verified to refuse rendering inside an iframe (Constitution Principle IV's narrow identity sign-in exception).
- **FR-021**: A completed sign-in MUST persist across multiple visitor conversations — ending a conversation, starting a new one, or an idle auto-reset firing (FR-012) MUST NOT sign the assistant out or require signing in again, for as long as the underlying sign-in session remains valid.
- **FR-022**: Sign-in is performed by kiosk staff/an operator using a shared organizational Microsoft account, not by individual visitors; the feature MUST NOT require a distinct sign-in from every visitor who wants to ask a question.
- **FR-023**: If the sign-in popup is closed, cancelled, or blocked before completing sign-in, the section MUST return to (or remain in) a state that clearly still shows sign-in is needed and offers a way to retry.

### Key Entities

- **Voice Query**: A single spoken question from a visitor, together with its recognized transcript and the knowledge domain it was matched to.
- **Assistant Response**: The answer delivered for a given Voice Query, including which knowledge domain and source content it drew from.
- **Knowledge Domain**: One of the three supported topic areas (Innovation Centre, company, employees) that bounds what the assistant is allowed to answer about.
- **Conversation Session**: The sequence of Voice Queries and Assistant Responses between a visitor opening the section and ending it (or having it cleared by idle auto-reset); not retained after it ends.
- **Employee Profile**: One curated, pre-approved staff highlight (a team lead or highlighted staff member) that the assistant may reference when answering an employee question — name, role, team, and a short approved bio; not a live HR record (see Clarifications Q1).
- **Sign-In Session**: The Microsoft account authentication state that authorizes the assistant to answer questions at all. Established once by an operator (FR-022), independent of and longer-lived than any single Conversation Session (FR-021) — clearing a Conversation Session never clears this. Not modeled or stored by this feature itself; it is held by the identity provider/embedded assistant, not by kiosk application data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor asking a clear, in-domain question receives a relevant answer within a few seconds of finishing speaking, without staff assistance.
- **SC-002**: At least 90% of a representative test set of in-domain questions, spread across all three knowledge domains, receive an accurate and relevant answer.
- **SC-003**: 100% of out-of-domain questions or out-of-scope employee questions in a representative test set receive the defined "cannot help with that" response rather than a fabricated answer.
- **SC-004**: The voice information section never causes the kiosk shell to scroll, regardless of answer length, verified the same way as the shell's existing no-scroll checks (spec 001 SC-004).
- **SC-005**: No conversation content from one visitor session remains visible or audible to the next visitor, in 100% of tested end-of-session and idle-reset scenarios.
- **SC-006**: The kiosk continues to run reliably (voice section remains functional, no degradation) after multiple days of continuous unattended operation, consistent with the shell's existing 72-hour reliability bar (spec 001 SC-007).
- **SC-007**: A visitor with no prior guidance can identify at least one example question to try, for each of the three supported domains, within the section's initial view.
- **SC-008**: Once an operator has signed in, 100% of visitor conversations that follow during that same signed-in session are usable without any of those visitors being asked to sign in themselves.
- **SC-009**: A person looking at the section when sign-in is required can tell that sign-in (not a broken assistant) is what's needed, within a few seconds and without staff explanation.

## Assumptions

- The voice information section is added as a new entry point in the kiosk's existing single-row navigation (an additional tab alongside Board Agenda, Local Transit, Company Highlights, and Guest Wi-Fi), consistent with the single-page, inline-only architecture established in spec 001 — rather than a floating overlay or a separate route.
- "Multi-agent" describes an internal implementation approach (e.g., routing a question to a specialized handler per knowledge domain behind the scenes); from the visitor's perspective this is a single, continuous assistant, not three assistants they must choose between. The internal agent architecture is a planning/implementation decision, not a spec-level requirement.
- The kiosk hardware provides a working microphone and audio output (needed for the spoken responses selected in Q3); sourcing or configuring that hardware is out of scope for this feature.
- Knowledge content for all three domains (Innovation Centre facts, company facts, and the curated set of approved Employee Profiles from Q1) is authored and maintained by kiosk content owners ahead of launch, the same way existing tab content (e.g., Board Agenda sessions) is prepared as static/maintained data.
- Speech recognition and answer generation call an external or internal AI service through a backend proxy that holds any required credentials (Constitution Principle VI); the specific service/vendor is a technical decision for the planning phase, not part of this spec.
- The existing idle-auto-reset and attract-mode behavior from spec 001 continues to govern the kiosk overall; this feature only adds the interaction/clearing rules in FR-011 and FR-012 on top of that existing behavior.
- English and Hungarian are the only languages required, matching the kiosk's existing language toggle; no additional languages are in scope.
- Sign-in is a one-time (per session-lifetime) operational step performed by kiosk staff, using a shared/organizational Microsoft account set up for this purpose — not something the kiosk expects walk-up visitors to do themselves. Re-signing in after the underlying session expires (frequency unknown, controlled by the identity provider/agent configuration, not this app) is an accepted operational task, not a defect.
- Signing in authenticates the browser session / embedded assistant connection as a whole, not an individual conversation — this is why FR-021 requires it to survive conversation-level clearing (FR-012). The exact persistence mechanism (browser session, cookie-based SSO, or similar) is controlled by the identity provider and the embedded assistant, not by this application's own code.
- The kiosk browser is expected to run with a persistent (non-incognito, non-cleared) profile so that the underlying Microsoft sign-in session can actually persist as FR-021 requires; if the kiosk browser profile is reset or cleared between sessions, re-signing in is expected.

## Clarifications

### Session 2026-09-09

- Q1: What scope of employee information may the assistant disclose? → A: Curated staff highlights — a curated set of approved employee profiles (team leads plus a small set of highlighted staff bios), authored and approved ahead of launch; no live HR data or general staff directory.
- Q2: How does a visitor start and stop listening? → A: Push-to-talk button — the visitor taps/holds an on-screen button to talk, and listening stops on release or a second tap. No always-on or wake-word listening.
- Q3: How does the assistant deliver its answer? → A: Spoken (text-to-speech) plus simultaneous on-screen captions/transcript.

### Session 2026-09-09 (amendment — sign-in requirement)

- The published Copilot Studio agent now requires Microsoft account sign-in before it will answer any question. The user directed that this be solved with a sign-in popup ("make this a pop-up because the whole functionality is worthless without it"), explicitly accepting a narrow, documented exception to the kiosk's normal no-popup design (Constitution Principle IV) for this one case, since Microsoft's sign-in page cannot be rendered inline. See FR-019 through FR-023, the new User Story 1, and Constitution v1.1.0.
- Confirmed via the user's own phrasing ("my (or someone's) Microsoft account") that sign-in is performed by an operator using a shared account, not by individual visitors — see FR-022 and the corresponding Assumptions.
