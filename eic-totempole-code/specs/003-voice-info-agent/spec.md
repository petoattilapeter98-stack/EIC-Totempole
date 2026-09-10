# Feature Specification: Voice Information Assistant

**Feature Branch**: `feat/voice-info-agent`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "I want to integrate a multi-agent voice information subpage to the main screen, developing on a separate branch. This voice agent will act as an information provider to customers, answering questions regarding our innovation centre, company and employees." Amended 2026-09-09: "The agent integrated by copilot is now published with microsoft authentication. What I want to do is have a login possibility to my (or someone's) microsoft account when entering the voice-info-agent. make this a pop-up because the whole functionality is worthless without it." Amended 2026-09-10: "There is a new copilot agent deployment ... we will deploy the agent without auth ... include voice speech to text ... integrate this with chrome's built in STT ... I do not want the user to have [to] press any button while discussing with the agent." Sign-in is no longer required (see Clarifications, Session 2026-09-10) — User Story 1 below replaces the sign-in story it superseded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor has a completely hands-free voice conversation (Priority: P1) — REPLACES the sign-in story (Session 2026-09-10)

**Superseded**: the original User Story 1 ("Someone signs in with a Microsoft account") no longer applies. The Copilot Studio agent was re-deployed 2026-09-10 with Web Channel Security's "Require secured access" OFF, so no sign-in of any kind — operator or visitor — is needed for the assistant to answer questions. See Clarifications, Session 2026-09-10, for what replaced it and why.

A visitor walks up, taps Start once, and has an entire conversation using only their voice — no push-to-talk button, no on-screen keyboard, no tapping anything to send a question or hear the next answer. The only two taps in the whole interaction are Start (to begin) and End (to stop); everything in between is voice-only.

**Why this priority**: This is now the foundational interaction model the rest of the feature depends on — every other user story (asking about the Innovation Centre, the company, employees) assumes this hands-free loop already works. It replaces the sign-in story as the highest-priority requirement because, unlike sign-in, it is not an external configuration step — it is this application's own core interaction contract with the visitor.

**Independent Test**: Open the voice information section, tap Start, ask a question purely by speaking (no other tap), receive and read the assistant's on-screen reply, ask a follow-up purely by speaking, then tap End — confirm no control other than Start and End was ever needed.

**Acceptance Scenarios**:

1. **Given** the voice information section is idle, **When** the visitor taps Start, **Then** the section begins listening immediately, with no further tap required to begin speaking (no push-to-talk, no wake word needed beyond simply speaking).
2. **Given** the assistant is listening, **When** the visitor speaks a question and stops talking, **Then** the section recognizes the utterance and sends it to the assistant automatically — the visitor never taps a "send" or "ask" control.
3. **Given** the assistant has just replied, **When** the visitor speaks a follow-up question without touching the screen, **Then** the section is still listening and sends the follow-up the same way, with no need to re-tap Start.
4. **Given** a conversation is in progress or has just finished, **When** the visitor wants to stop, **Then** tapping End is the only control they need to touch to leave the section.
5. **Given** this browser does not support the speech recognition this feature relies on, or the visitor has not granted microphone access, **When** the section is started, **Then** it clearly shows this rather than sitting silently as if listening.

---

### User Story 2 - Visitor asks about the Innovation Centre by voice (Priority: P2)

A visitor at the kiosk wants to understand what the Innovation Centre is, what happens there, and what facilities or programs it hosts. Instead of hunting through tabs, they open the voice information section, ask their question out loud, and get a direct answer without needing staff.

**Why this priority**: This is the core reason the feature exists — turning the kiosk from a static display into something a visitor can actually ask questions of. It's the smallest slice that proves the assistant works end-to-end (listening, understanding, answering) and is independently valuable even before company or employee topics are added. Depends on User Story 1 — the hands-free listen/send/receive loop must already work.

**Independent Test**: Open the voice information section, tap Start, ask a question clearly about the Innovation Centre by voice (e.g., "What is this Innovation Centre for?"), and confirm a relevant, accurate answer is delivered back to the visitor as on-screen text without leaving the single kiosk page.

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

- What happens if the visitor's browser has no speech recognition support at all (spec.md assumes Chrome; see Assumptions)? The section MUST show a clear message that this browser can't provide speech recognition, rather than sitting silently as if listening.
- What happens if the visitor/operator denies the microphone permission prompt, or the kiosk browser profile has never granted it? The section MUST show a clear message that microphone access is needed, rather than sitting silently as if listening.
- What happens when the visitor is silent or speaks too quietly for the microphone to pick up anything? Recognition simply keeps listening — there is no explicit "didn't catch that" turn boundary in a hands-free, continuous-listening design; the visitor can just speak again.
- What happens when background noise in the lobby (other conversations, ambient sound) interferes with recognition? A misrecognized or garbled question is sent to the assistant as recognized; if that produces an off-topic or unhelpful reply, the visitor can simply ask again by voice — there is no button-based "retry" needed.
- What happens when the assistant backend (the bot's Direct Line channel) is temporarily unavailable or the connection drops? The section MUST show a clear, friendly unavailable message with a way to retry, and MUST NOT leave the visitor looking at a stuck "connecting" state indefinitely.
- What happens if a recognized utterance fails to actually reach the assistant (e.g., a dropped network request)? The section MUST show a clear, brief message that it didn't get through, without losing the rest of the conversation or requiring the visitor to restart the section.
- What happens if the visitor asks something entirely outside all three supported domains (e.g., unrelated small talk, or a question the shell's header already answers like the weather)? The assistant MUST say it cannot help with that and, where relevant, MUST NOT duplicate or contradict information already shown elsewhere on the kiosk shell.
- What happens if the kiosk's existing idle auto-reset fires while a conversation is in progress? Per FR-011/FR-012 below, genuine listening/response activity counts as interaction and prevents reset; if the visitor has stopped interacting long enough for the countdown to legitimately reach zero, the conversation MUST be cleared the same way other in-progress state is cleared today.
- What happens if a visitor's answer text, or the running transcript, is too long to fit the fixed viewport? Per FR-006, on-screen content MUST truncate, cap, or scroll only within its own contained area rather than causing the outer kiosk page to overflow or scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kiosk MUST provide a dedicated voice information section reachable from the main kiosk screen, presented inline within the existing single page — MUST NOT open as a modal, popup, or separate route (Constitution Principle IV). **Updated 2026-09-10**: the sign-in popup exception this requirement previously carved out no longer applies to this feature — the agent no longer requires sign-in (Clarifications, Session 2026-09-10) — so this feature now has zero popups of any kind.
- **FR-002**: The section MUST accept spoken natural-language questions from a visitor via the kiosk's microphone, recognized using the browser's built-in speech-to-text (Clarifications, Session 2026-09-10) — no separate hardware or server-side audio pipeline.
- **FR-003**: The assistant MUST be able to answer questions across three knowledge domains: (a) the Innovation Centre — what it is, its purpose, facilities, and hosted events/programs; (b) the company — history, mission, and services; and (c) employees, limited to a curated set of approved employee profiles (team leads plus a small set of highlighted staff bios — see Clarifications Q1); it MUST NOT disclose live HR data, contact details, or any employee not in that approved set.
- **FR-004** **(superseded 2026-09-10, was push-to-talk)**: Listening MUST be continuous and hands-free for the entire duration the section is active — the visitor speaks whenever they want, with no push-to-talk control, no hold-to-talk gesture, and no per-question button of any kind (see User Story 1). The only two controls in this feature are Start (begins the session) and End (ends it); both MUST meet the kiosk's minimum touch target sizing and spacing (Constitution Principle III).
- **FR-005** **(superseded 2026-09-10, was spoken TTS + captions)**: The assistant MUST deliver its answer as on-screen text only, rendered as it is received — no synthesized speech/audio output for this iteration (Clarifications, Session 2026-09-10).
- **FR-006**: Any on-screen text shown for a response (caption, transcript, or text-only answer) MUST render within the fixed kiosk viewport without introducing scrolling, truncating or summarizing gracefully when an answer would otherwise overflow (Constitution Principle II).
- **FR-007**: The visitor MUST be able to ask a follow-up question within the same open session without closing and reopening the section.
- **FR-008**: The visitor MUST be able to end the voice interaction at any time and return inline to the kiosk's prior state, with no confirmation modal and no page navigation.
- **FR-009**: When a question falls outside the three supported domains, or asks for employee information outside the approved public dataset, the assistant MUST clearly state it cannot help with that part of the question rather than fabricating or guessing an answer.
- **FR-010**: When speech recognition is unavailable (unsupported browser, denied microphone permission), a recognized utterance fails to reach the assistant, or the assistant backend is unavailable, the section MUST show a clear fallback message without requiring the visitor to restart the kiosk shell. **Updated 2026-09-10**: because listening is continuous (FR-004) rather than turn-based, plain silence/no-speech is not itself an error state requiring a message — recognition simply keeps listening.
- **FR-011**: Active use of the voice section (listening for or receiving an answer to a question) MUST count as visitor interaction for the kiosk's existing idle countdown (spec 001 FR-018), so a conversation in progress is not interrupted by an unrelated auto-reset.
- **FR-012**: Any conversation audio, transcript, or generated answer MUST be discarded when the kiosk's idle auto-reset fires (spec 001 FR-019) or when the visitor explicitly ends the session, so no visitor's conversation remains visible or audible to the next visitor. This clearing MUST NOT sign the assistant out (see FR-021).
- **FR-013**: Any credential or API key required to call underlying knowledge-lookup or answer-generation services MUST be held and used server-side only; the kiosk client MUST NOT embed, expose, or transmit such secrets (Constitution Principle VI). **Updated 2026-09-10**: speech recognition itself (FR-002) runs entirely in-browser via the visitor's own Chrome instance and requires no credential this app holds; the credential this requirement now governs is the assistant bot's own Direct Line secret (see plan.md's Direct Line integration).
- **FR-014**: The voice information section MUST be built as an isolated module that can be disabled or removed without modifying the shell or any other kiosk tab (Constitution Principle IX).
- **FR-015**: The voice information section MUST support both of the kiosk's existing display languages (EN/HU), following the visitor's current language selection from the shell's language toggle (spec 001 FR-007).
- **FR-016**: When first opened with no prior question asked, the section MUST display example questions covering all three supported domains, to help visitors who don't know what to ask.
- **FR-017**: Any microphone connection, audio stream, or timer used by the voice section MUST be released or stopped when a conversation ends or the section becomes inactive, and MUST NOT be re-created without first releasing the prior instance (Constitution Principle V).
- **FR-018**: The assistant's answers MUST be drawn from an approved, maintained set of Innovation Centre, company, and employee content rather than open-ended, unreviewed lookup, so answers stay accurate and on-brand.
- **FR-019** **(reassigned 2026-09-10, was sign-in requirement)**: The assistant MUST NOT require any visitor- or operator-performed sign-in before it will answer questions — the deployed agent is configured for unauthenticated access (Clarifications, Session 2026-09-10), and this feature MUST NOT introduce one of its own.
- **FR-020** **(reassigned 2026-09-10, was sign-in popup)**: This feature MUST NOT open any popup window. The one narrow popup exception this feature previously required (Constitution Principle IV's identity sign-in exception) no longer applies, because there is no sign-in step left to complete.
- **FR-021** **(reassigned 2026-09-10, was sign-in persistence)**: Between the visitor tapping Start and either tapping End or the idle auto-reset firing, the section MUST maintain one continuous, uninterrupted connection to the assistant — no reconnection or re-initialization MUST be visibly required mid-conversation for reasons internal to this app.
- **FR-022** **(reassigned 2026-09-10, was operator sign-in model)**: Every visitor MUST be able to start and use the assistant independently, with no operator action of any kind required before or during their conversation.
- **FR-023** **(reassigned 2026-09-10, was sign-in retry)**: If the connection to the assistant fails to establish or drops mid-conversation, the section MUST show a clear, recoverable error and offer a way to retry, without restarting the kiosk shell (mirrors FR-010).
- **FR-024** *(new 2026-09-10)*: Because the browser's built-in speech recognition this feature relies on (FR-002) is, in practice, reliably available only in Google Chrome (not Microsoft Edge, even though Edge is also Chromium-based — see research.md), the kiosk's browser MUST be Google Chrome for this feature to function; this is an operational/deployment requirement, not something this feature's code can detect or work around.

### Key Entities

- **Voice Query**: A single spoken question from a visitor, together with its recognized transcript and the knowledge domain it was matched to.
- **Assistant Response**: The answer delivered for a given Voice Query, including which knowledge domain and source content it drew from.
- **Knowledge Domain**: One of the three supported topic areas (Innovation Centre, company, employees) that bounds what the assistant is allowed to answer about.
- **Conversation Session**: The sequence of Voice Queries and Assistant Responses between a visitor opening the section and ending it (or having it cleared by idle auto-reset); not retained after it ends.
- **Employee Profile**: One curated, pre-approved staff highlight (a team lead or highlighted staff member) that the assistant may reference when answering an employee question — name, role, team, and a short approved bio; not a live HR record (see Clarifications Q1).

**Removed 2026-09-10**: the Sign-In Session entity from the 2026-09-09 amendment no longer exists — there is nothing to sign into (Clarifications, Session 2026-09-10). It is replaced, at the implementation level only (not a spec-level entity, since it bounds no visitor-facing behavior beyond FR-021/FR-023), by a Direct Line connection scoped one-to-one with each Conversation Session — see data-model.md.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor asking a clear, in-domain question receives a relevant answer within a few seconds of finishing speaking, without staff assistance.
- **SC-002**: At least 90% of a representative test set of in-domain questions, spread across all three knowledge domains, receive an accurate and relevant answer.
- **SC-003**: 100% of out-of-domain questions or out-of-scope employee questions in a representative test set receive the defined "cannot help with that" response rather than a fabricated answer.
- **SC-004**: The voice information section never causes the kiosk shell to scroll, regardless of answer length, verified the same way as the shell's existing no-scroll checks (spec 001 SC-004).
- **SC-005**: No conversation content from one visitor session remains visible or audible to the next visitor, in 100% of tested end-of-session and idle-reset scenarios.
- **SC-006**: The kiosk continues to run reliably (voice section remains functional, no degradation) after multiple days of continuous unattended operation, consistent with the shell's existing 72-hour reliability bar (spec 001 SC-007).
- **SC-007**: A visitor with no prior guidance can identify at least one example question to try, for each of the three supported domains, within the section's initial view.
- **SC-008** **(replaced 2026-09-10, was sign-in persistence)**: 100% of visitor conversations are usable with zero sign-in step of any kind, by any visitor, at any time of day.
- **SC-009** **(replaced 2026-09-10, was sign-in messaging)**: In 100% of tested conversations from Start to End, the visitor is never required to touch the screen for any reason other than the initial Start tap and the final End tap.

## Assumptions

- The voice information section is added as a new entry point in the kiosk's existing single-row navigation (an additional tab alongside Board Agenda, Local Transit, Company Highlights, and Guest Wi-Fi), consistent with the single-page, inline-only architecture established in spec 001 — rather than a floating overlay or a separate route.
- "Multi-agent" describes an internal implementation approach (e.g., routing a question to a specialized handler per knowledge domain behind the scenes); from the visitor's perspective this is a single, continuous assistant, not three assistants they must choose between. The internal agent architecture is a planning/implementation decision, not a spec-level requirement.
- The kiosk hardware provides a working microphone (needed for FR-002's speech recognition); sourcing or configuring that hardware is out of scope for this feature. **Updated 2026-09-10**: audio output/speakers are no longer a requirement — FR-005 delivers answers as on-screen text only, not synthesized speech.
- Knowledge content for all three domains (Innovation Centre facts, company facts, and the curated set of approved Employee Profiles from Q1) is authored and maintained by kiosk content owners ahead of launch, the same way existing tab content (e.g., Board Agenda sessions) is prepared as static/maintained data.
- Answer generation (routing a question to the right knowledge domain and producing a reply) is performed entirely by the Copilot Studio agent, reached directly from the browser via its own public, unauthenticated Direct Line connection (Constitution Principle VI: no credential exists in this flow to hold, client- or server-side); speech recognition itself (FR-002) likewise runs entirely client-side. See plan.md's Direct Line integration and research.md R13.
- The existing idle-auto-reset and attract-mode behavior from spec 001 continues to govern the kiosk overall; this feature only adds the interaction/clearing rules in FR-011 and FR-012 on top of that existing behavior.
- English and Hungarian are the only languages required, matching the kiosk's existing language toggle; no additional languages are in scope.
- **(2026-09-10)** The kiosk's browser is Google Chrome specifically, not Microsoft Edge — see FR-024 and research.md's finding that Edge's Chromium engine does not include the speech-recognition backend Chrome's `SpeechRecognition` API depends on. This is a change from spec 001/plan.md's prior "Edge/Chromium" target platform language, scoped to this feature only.
- **(2026-09-10)** The kiosk has a working internet connection at all times the assistant is used — both Chrome's speech-recognition service and the Direct Line connection to the assistant require it. This was already implicitly true for the previous iframe-embed design and is not a new constraint, only made explicit here.

## Clarifications

### Session 2026-09-09

- Q1: What scope of employee information may the assistant disclose? → A: Curated staff highlights — a curated set of approved employee profiles (team leads plus a small set of highlighted staff bios), authored and approved ahead of launch; no live HR data or general staff directory.
- Q2: How does a visitor start and stop listening? → A: Push-to-talk button — the visitor taps/holds an on-screen button to talk, and listening stops on release or a second tap. No always-on or wake-word listening.
- Q3: How does the assistant deliver its answer? → A: Spoken (text-to-speech) plus simultaneous on-screen captions/transcript.

### Session 2026-09-09 (amendment — sign-in requirement)

- The published Copilot Studio agent now requires Microsoft account sign-in before it will answer any question. The user directed that this be solved with a sign-in popup ("make this a pop-up because the whole functionality is worthless without it"), explicitly accepting a narrow, documented exception to the kiosk's normal no-popup design (Constitution Principle IV) for this one case, since Microsoft's sign-in page cannot be rendered inline. See FR-019 through FR-023, the new User Story 1, and Constitution v1.1.0.
- Confirmed via the user's own phrasing ("my (or someone's) Microsoft account") that sign-in is performed by an operator using a shared account, not by individual visitors — see FR-022 and the corresponding Assumptions.

### Session 2026-09-10 (amendment — new no-auth agent, hands-free voice, Chrome STT)

The user supplied a new Copilot Studio agent deployment (`cre88_noauthroutingagent_FUwQYD`, same environment), published with Web Channel Security's "Require secured access" OFF — no sign-in of any kind is required. This **replaces** the entire 2026-09-09 sign-in amendment above: User Story 1, FR-019–FR-023, SC-008/SC-009, and the Sign-In Session entity are all superseded by the entries above marked "2026-09-10". The 2026-09-09 sign-in text is kept, unedited, as a historical record of what shipped and why, per this project's established documentation convention (see tasks.md's numbering-note precedent).

Two further directives from this session, resolved without needing a clarifying question (informed guesses per this command's own guidance, since both have a single reasonable reading given the user's explicit words):

- **Q4 (supersedes Q2)**: How does a visitor start and stop listening? → A: **Hands-free, continuous listening once Start is tapped** — no push-to-talk, no per-question button. Resolved directly from the user's own words: "I do not want the user to have [to] press any button while discussing with the agent." See FR-004, User Story 1.
- **Q5 (supersedes Q3)**: How does the assistant deliver its answer? → A: **On-screen text only**, no synthesized speech. Resolved via a clarifying question this session (options offered: spoken+captions, text-only, spoken-only) — the user chose text-only. See FR-005.

A third, purely technical decision made this session — routing the assistant connection through this app's own Direct Line client instead of embedding Microsoft's hosted webchat page, using the bot's own public, secretless token endpoint rather than any server-side component — is an implementation decision, not a spec-level clarification (spec.md deliberately does not name a specific integration mechanism); it is recorded in plan.md and research.md, including a same-day correction after an initial (unwanted) design added infrastructure that turned out to be unnecessary.
