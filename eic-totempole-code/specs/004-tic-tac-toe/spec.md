# Feature Specification: Fullscreen Tic-Tac-Toe

**Feature Branch**: `feature/tic-tac-toe` (spec directory: `004-tic-tac-toe`)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Create a new feature on a new feature branch for a fullscreen Tic-Tac-Toe game. When the user clicks the "Play" button, open the Tic-Tac-Toe game in a fullscreen/enlarged view, following the same fullscreen interaction and visual behavior as the existing enlarged map view. The fullscreen game should: Display a playable 3x3 Tic-Tac-Toe board. Allow two players to take turns placing X and O. Clearly indicate whose turn it is. Detect when a player wins or the game ends in a draw. Display the game result when the game ends. Provide an option to start a new game/restart the current game."

## Interpretation Note: "fullscreen" and "clicks"

**"Fullscreen" means the kiosk's own enlarged view, not the browser's fullscreen mode.** The
request ties the game to "the same fullscreen interaction and visual behavior as the existing
enlarged map view". That view — the restaurant map's expanded state (feature 003, FR-024 to
FR-026) — fills the whole 1920x1280 viewport as an inline state of the single page, covering the
header, hero and navigation bar, with a persistent control that returns to the normal layout.
Constitution Principle IV forbids routes, modal dialogs and popups, so the game view is the same
kind of inline state. It is not a separate page, not a dialog, and not the browser's own
fullscreen mode, which a kiosk browser already runs in and which a visitor could leave with a
gesture, stranding the display.

**"Clicks" is read as "taps".** The kiosk is touch-only (Constitution Principle I). Every
interaction below is a tap on the touchscreen; none requires a mouse, hover or a hardware
keyboard.

**One deliberate difference from the map.** The game view matches the expanded map in layout,
return control and reset behaviour, with one exception: it does not dim in attract mode
(Clarifications, 2026-09-14). A map can be read without touching it, but players stop touching a
game board exactly when they are thinking about their next move, so the board must not fade while
they look at it. The game's normal tab view, like every other destination, still dims.

## Clarifications

### Session 2026-09-14

- Q: Where does the Play control live — on a new dedicated navigation destination, on the
  always-visible main screen such as the hero banner, or as a call to action inside attract mode?
  (FR-001) → A: On a new, sixth navigation destination. Its normal view, in the content region with
  the header, hero and navigation bar visible, shows a short introduction and the Play control.
- Q: After 30 seconds without a touch the kiosk dims to attract mode, and a touch then passes
  straight through to whatever is under it. Should the touch that wakes the screen place a mark,
  only wake the screen, or should the game view not dim at all? (FR-020) → A: The enlarged game view
  is exempt from dimming and stays at full presence throughout, so a tap on the board is always an
  ordinary move. The game's tab view still takes part in attract mode like every other destination,
  and the 60-second idle reset still applies to the game view.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two visitors play a game of Tic-Tac-Toe to the end (Priority: P1)

Two people waiting in the lobby tap the Tic-Tac-Toe entry in the navigation bar, read a one-line
introduction, and tap **Play**. The game fills the screen with an empty 3x3 board
and shows that X moves first. They take turns tapping empty squares; each tap places the current
player's mark and the screen shows whose turn is next. When one of them gets three in a row — or
the board fills with no winner — the game announces the result and highlights how it was won.

**Why this priority**: This is the feature. Without a board that two people can play to a
correct result, nothing else in this spec has a purpose. It is a viable MVP on its own: a
visitor can play one complete game and then leave with the return control.

**Independent Test**: Open the Tic-Tac-Toe destination, tap Play, play a game in which X completes
the top row, and confirm that
turns alternated correctly, the board refused taps on occupied squares, "X wins" appeared with the
top row highlighted, and no further marks could be placed. Repeat for an O win and for a draw.

**Acceptance Scenarios**:

1. **Given** the kiosk shows any destination in its normal layout, **When** a visitor taps the
   Tic-Tac-Toe entry in the navigation bar, **Then** the content region shows a short introduction
   and the Play control, with the header, hero and navigation bar still visible.
2. **Given** the Tic-Tac-Toe destination is open, **When** a visitor taps Play, **Then** the game
   fills the whole viewport, the board shows nine empty squares, and the screen indicates that it
   is X's turn.
3. **Given** a game is in progress and it is X's turn, **When** a visitor taps an empty square,
   **Then** an X appears in that square and the screen indicates that it is O's turn.
4. **Given** a game is in progress, **When** a visitor taps a square that already holds a mark,
   **Then** the board and the turn do not change and no error is shown.
5. **Given** X holds two squares of a row and that row's third square is empty, **When** X takes
   the third square, **Then** the screen shows that X has won, the three winning squares are
   visibly distinguished from the rest, and the turn indicator is no longer shown.
6. **Given** eight squares are filled with no completed line, **When** the ninth square is filled
   without completing a line, **Then** the screen shows that the game is a draw.
7. **Given** eight squares are filled, **When** the move that fills the ninth square also completes
   a line, **Then** the screen shows a win for that player, not a draw.
8. **Given** a game has ended, **When** a visitor taps any square, **Then** nothing is placed and
   the result stays on screen.
9. **Given** a game is in progress, **When** both players stop touching the screen for longer than
   the kiosk's attract threshold but less than its idle period, **Then** the game view stays at full
   presence, and the next tap on an empty square places a mark as usual.

---

### User Story 2 - Players start over without leaving the game (Priority: P2)

Whether a game has just ended or is going badly, a visitor taps **New game** and immediately gets
an empty board with X to move, without leaving the game view and tapping Play again.

**Why this priority**: Tic-Tac-Toe is short, and people who finish one game usually want another.
Without this, every rematch costs two extra taps and a trip out of the game view. It is valuable
but not essential: Story 1 alone still delivers a complete game.

**Independent Test**: Play three moves, tap New game, and confirm the board is empty and X is to
move. Then play a game to a result, tap New game, and confirm the same.

**Acceptance Scenarios**:

1. **Given** a game is in progress, **When** a visitor taps New game, **Then** the board is cleared
   at once, it is X's turn, and no confirmation step is shown.
2. **Given** a game has ended with a result shown, **When** a visitor taps New game, **Then** the
   result and any winning highlight are removed, the board is empty, and it is X's turn.
3. **Given** the game view is open, **When** the visitor looks for the New game control at any
   point — mid-game or after a result — **Then** it is visible without scrolling.

---

### User Story 3 - The game gets out of the way and the kiosk recovers on its own (Priority: P3)

A visitor who is done taps the return control and the kiosk goes back to its normal layout. A
visitor who simply walks away mid-game leaves nothing behind: after the normal idle period the
kiosk exits the game on its own, and the next person to tap Play gets a fresh board.

**Why this priority**: The game view hides the navigation bar, so on an unattended display it
must never become a place the kiosk gets stuck (Constitution Principle V). This matters for the
kiosk's health rather than for play itself, which is why it follows Stories 1 and 2 — but it must
ship with them.

**Independent Test**: Start a game, place a few marks, stop touching the screen, wait out the idle
period, and confirm the kiosk returns to its default destination in the normal layout. Tap Play
again and confirm the board is empty with X to move.

**Acceptance Scenarios**:

1. **Given** the game view is open, **When** a visitor taps the return control, **Then** the kiosk
   returns to the normal layout with the header, hero and navigation bar visible and the
   Tic-Tac-Toe destination still selected.
2. **Given** a visitor left the game view with a game in progress, **When** anyone taps Play again,
   **Then** the board is empty and it is X's turn.
3. **Given** the game view is open with a game in progress, **When** nobody touches the screen for
   the kiosk's idle period, **Then** the kiosk exits the game view as part of its normal reset and
   the game in progress is discarded.
4. **Given** two visitors are playing, **When** each move follows the last within the idle period,
   **Then** the kiosk does not reset the game out from under them.

---

### Edge Cases

- **Players pause to think for more than 30 seconds.** Anywhere else this would dim the screen to
  attract mode, and the next tap could land on a square the players can barely see. The game view
  is exempt from dimming (FR-020), so the board stays fully visible and the next tap is an ordinary
  move.
- **Players walk away mid-game.** Because the game view does not dim, an abandoned board stays at
  full presence until the 60-second idle reset exits it (FR-018), where any other view would have
  dimmed after 30 seconds. This is the accepted cost of FR-020; the idle reset still bounds it.
- **Six navigation entries in Hungarian.** Adding a sixth destination narrows every entry in the
  navigation bar, and several Hungarian labels are long. All six must still fit on one row, with no
  truncated label and full-size touch targets (FR-029).
- **Two touches land on the board at once.** The display is a large multi-touch surface; a second
  person's hand, a palm or a sleeve can touch the board during a move. The kiosk cannot tell whose
  hand is whose, so accepting both would place a mark for the player whose turn it was not
  (FR-010).
- **One move completes two lines at once** (for example a row and a diagonal). This is one win,
  not two, and every square in every completed line is highlighted (FR-013).
- **The winning move fills the last square.** This is a win, not a draw (FR-012).
- **A visitor taps New game or the return control by accident.** The game in progress is lost
  with no confirmation step. A game is at most nine moves, so the cost is small, and Constitution
  Principle IV rules out a confirmation dialog (FR-016, FR-017).
- **Players think for more than a minute between moves.** The kiosk's normal 60-second idle reset
  applies and the game is discarded (FR-018). A Tic-Tac-Toe move rarely takes that long, and a
  longer allowance would leave an abandoned board on screen for longer.
- **The language toggle is covered while the game is open**, because the enlarged view covers the
  header — as the expanded map does. Turn and result text stays in the language that was active
  when Play was tapped. Leaving the game makes the toggle reachable again.
- **The longest result or turn message in either language** must still fit the viewport alongside
  the board and controls, with nothing scrolled or clipped (FR-023).
- **The same move is tapped twice in quick succession.** The second tap lands on an occupied
  square and is ignored (FR-009), so a double tap can never place two marks.
- **The game is removed from the kiosk later.** Nothing else on the kiosk — including the
  restaurant map, whose enlarged view this game mirrors — may break or need editing (FR-027).

## Requirements *(mandatory)*

### Functional Requirements

**Starting the game**

- **FR-001**: The kiosk MUST offer the game as a new navigation destination. Its normal view MUST
  appear in the content region with the header, hero and navigation bar visible, like every other
  destination, and MUST show a short introduction and a clearly labelled **Play** control that
  opens the game view.
- **FR-028**: The Tic-Tac-Toe destination MUST be the sixth and last entry in the navigation bar,
  after Restaurants. It MUST NOT be the kiosk's default destination.
- **FR-029**: With six entries, the navigation bar MUST still show every entry on one row, in both
  languages, with no truncated label, and every entry MUST keep a touch target of at least 64x64
  CSS pixels with at least 16px between entries.
- **FR-030**: From the destination's normal view, tapping any other navigation entry MUST leave it
  directly, with no intermediate step.
- **FR-002**: Tapping Play MUST open the game view with an empty board and X to move, every time.

**The enlarged game view**

- **FR-003**: The game view MUST fill the entire viewport and MUST cover the header, hero and
  navigation bar, matching the restaurant map's expanded state (feature 003, FR-024) except in
  attract mode (FR-020).
- **FR-004**: The game view MUST show a persistent, always-visible return control that leaves the
  game view and restores the normal layout. It MUST match the expanded map's return control in
  placement, size and visual treatment, so a visitor who has used one
  recognises the other (feature 003, FR-025).
- **FR-005**: The game view MUST NOT be a trap: the return control is always visible and never
  fades or auto-hides, and the kiosk's idle reset also exits the view (FR-018), matching feature
  003 FR-026.
- **FR-006**: The game view MUST be an inline state of the single page. It MUST NOT be a separate
  page or address, a dialog, a popup, or the browser's own fullscreen mode (Constitution
  Principle IV).
- **FR-007**: When the game view opens, keyboard focus MUST move into it so a keyboard or
  screen-reader user is not left behind the covered navigation; when it closes, focus MUST return
  to the Play control. Focus MUST NOT be trapped inside the view (matching feature 003).

**Playing**

- **FR-008**: The board MUST be a 3x3 grid of nine squares, all empty at the start of each game.
- **FR-009**: Two players MUST share the one screen and alternate turns, X first in every game.
  Tapping an empty square during a game in progress MUST place the current player's mark there and
  pass the turn to the other player. Tapping a square that already holds a mark MUST change
  nothing and MUST NOT show an error.
- **FR-010**: A touch that begins while another touch is still in contact with the board MUST be
  ignored, so that a stray second hand cannot place a mark for the wrong player.
- **FR-011**: While a game is in progress, the screen MUST show whose turn it is at all times,
  naming the player by their mark (X or O) in text. Colour MUST NOT be the only way the current
  player is indicated.

**Ending a game**

- **FR-012**: The game MUST detect a win immediately after the move in which a player comes to
  hold all three squares of any row, column or diagonal (eight possible lines). It MUST detect a
  draw when all nine squares are filled and no line is complete. A move that both fills the ninth
  square and completes a line MUST be reported as a win.
- **FR-013**: When a game ends, the result MUST replace the turn indicator, stating "X wins",
  "O wins" or a draw in the active language. For a win, every square belonging to a completed line
  MUST be visually distinguished from the other squares, and not by colour alone.
- **FR-014**: The result MUST be shown inline within the game view, MUST NOT cover the board, and
  MUST remain on screen until New game is tapped, the view is left, or the kiosk resets, so that
  players can see how the game ended.
- **FR-015**: Once a game has ended, tapping any square MUST change nothing.

**Starting over**

- **FR-016**: A **New game** control MUST be visible throughout the game view, both during a game
  and after a result is shown. Tapping it MUST immediately clear the board, remove any result and
  highlight, and give X the first move, with no confirmation step.

**Leaving and resetting**

- **FR-017**: Leaving the game view by the return control MUST discard the game in progress; there
  is no resuming. The next Play always starts a fresh game (FR-002).
- **FR-018**: The kiosk's existing idle reset MUST apply unchanged while the game view is open:
  after the idle period with no touch, the kiosk MUST exit the game view, discard the game in
  progress, and return to its default destination. No visitor may inherit a previous visitor's
  board.
- **FR-019**: Every touch on the game view, including each move, MUST count as visitor activity
  for the idle reset, so an active game is not reset out from under its players (User Story 3,
  scenario 4).
- **FR-020**: The enlarged game view MUST NOT dim, recede or otherwise change its appearance in
  attract mode. It MUST stay at full presence for as long as it is open, so every tap on the board
  is an ordinary move. This is the one intended difference from the expanded map (feature 003,
  FR-035). The exemption MUST NOT affect attract mode anywhere else: the Tic-Tac-Toe destination's
  normal view MUST dim like every other destination, and attract mode MUST work as usual once the
  game view is left or reset.

**Language, accessibility and layout**

- **FR-021**: All text in the feature — the navigation label, the introduction, Play, New game, the
  return control, turn and result messages, and every accessible name — MUST be available in English and Hungarian and follow the
  kiosk's active language. The marks X and O are the same in both languages.
- **FR-022**: Every square, the New game control and the return control MUST be reachable by
  keyboard and MUST carry an accessible name. Each square's name MUST state its position and its
  contents (empty, X or O). Each change of turn and the result MUST be announced to screen-reader
  users without moving focus. All text and marks MUST meet WCAG AA contrast (Constitution
  Principle VII).
- **FR-023**: The destination's normal view and every state of the game view — empty board,
  mid-game, each result, in either language — MUST fit the viewport exactly with no scrolling (Constitution Principle II).
- **FR-024**: Every square and control MUST present a touch target of at least 64x64 CSS pixels,
  with at least 16px between adjacent targets (Constitution Principle III).

**Boundaries**

- **FR-025**: The game MUST NOT collect, store or transmit any data about the players or their
  games. Nothing about a game survives leaving the view or a reset.
- **FR-026**: The game MUST work with no network connection and MUST NOT depend on any external
  service.
- **FR-027**: The game MUST be removable from the kiosk without changing or breaking any other
  feature, including the restaurant map; removing it takes the sixth navigation entry with it. The
  attract-mode exemption (FR-020) MUST likewise be something the game declares for itself, not a
  special case written into the kiosk shell for this feature. If the game and the map share the enlarged-view
  behaviour, that behaviour MUST be a shared kiosk capability that both depend on, not something
  one feature takes from the other (Constitution Principle IX).

### Key Entities

- **Game**: One round of play. Holds the board, whose turn it is, and its status: in progress, won
  by X, won by O, or drawn. When won, it also identifies the square(s) of the completed line(s).
  Exists only while the game view is open; discarded on New game, on leaving the view and on idle
  reset. There is only ever one.
- **Square**: One of the nine positions on the board, identified by row and column. Holds empty,
  X or O. Once marked, it never changes within the same game.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any destination in the kiosk's normal layout, a visitor reaches an empty board
  ready to play in exactly two taps: the navigation entry, then Play.
- **SC-002**: Across every board position reachable in legal play (5,478 positions, including the
  empty board), the game reports the correct status — in progress, X wins, O wins or draw — with no
  win missed, no premature result, and no win reported as a draw.
- **SC-003**: After every move in every test game, the turn indicator or result shown on screen
  matches the board in 100% of cases.
- **SC-004**: A placed mark, a turn change and a result all appear within 0.1 seconds of the tap
  that caused them, so play feels instant.
- **SC-005**: The destination's normal view and every game view state, in both languages, fill the
  1920x1280 viewport with zero scrolling and no clipped text, including the longest turn and result
  messages. The navigation bar shows all six entries on one row with no truncated label in either
  language.
- **SC-006**: 100% of squares and controls in the game view measure at least 64x64 CSS pixels with
  at least 16px separation.
- **SC-007**: In 100% of trials, after an idle reset or leaving the game view, the next Play shows
  an empty board with X to move.
- **SC-008**: The kiosk can play 500 consecutive games and then sit idle for 72 hours with no growth
  in memory use and no loss of responsiveness (Constitution Principle V).
- **SC-009**: In hallway testing with people who have not seen the kiosk before, at least 9 of 10
  pairs start a game, finish it, and start a second game without help.
- **SC-010**: A keyboard-only user can play a complete game and start a new one, and a screen-reader
  user hears every turn change and the final result.
- **SC-011**: In 100% of trials where players pause mid-game for longer than 30 seconds and less
  than 60 seconds, the board remains at full presence and their next tap places a mark. In 100% of
  trials, the Tic-Tac-Toe destination's normal view and every other destination still dim after 30
  seconds untouched.

## Assumptions

- **Two players share one screen** and stand at the kiosk together. There is no computer opponent,
  and the kiosk makes no attempt to tell the players apart beyond whose turn it is.
- **X always moves first**, in every game, including after New game. Alternating the first player
  between games would need the kiosk to remember something across games; players can simply swap
  roles.
- **No confirmation before New game or leaving.** A game is at most nine moves, so an accidental
  restart costs little, and Constitution Principle IV forbids a confirmation dialog. An inline
  confirmation step was judged not worth the extra tap on every deliberate restart.
- **Leaving discards the game.** Resuming would mean a half-finished board waiting for the next
  visitor, who is usually a different person; a fresh board on every Play is simpler and matches
  the kiosk's rule that no visitor inherits another's state (feature 003, FR-011).
- **The kiosk's existing timings are reused unchanged**: a 60-second idle reset and attract mode
  after 30 seconds. This feature does not introduce its own timeouts. The game view opts out of the
  visual effect of attract mode (FR-020), not the timers: the idle reset still exits it at 60 seconds.
- **The introduction is one or two short lines**, such as how many players and how to win. It is
  not a rules page, and it has to leave room for the Play control in the content region.
- **The restaurant map's expanded state is the reference** for the game view's layout, return
  control and behaviour. That state exists on the `feature/mappage` branch, which is not yet merged,
  so this branch starts from it. If the map's expanded state changes before this ships, the game
  view follows it.
- **Hungarian wording needs a native-speaker check.** The common Hungarian name "amőba" usually
  refers to five-in-a-row on a large grid, so a literal label could mislead Hungarian visitors about
  what they are about to play.
- **No sound.** A lobby display plays no audio; every piece of feedback is visual and, for
  screen-reader users, announced.

## Out of Scope

- A computer opponent or any difficulty setting.
- Scores, win tallies, streaks or history across games, which would also need a cap to satisfy
  Constitution Principle V.
- Player names or any other personal input.
- Undo or taking back a move.
- Boards larger than 3x3 and other variants, such as five-in-a-row.
- Move timers or a clock per player.
- Play across devices, online, or against people elsewhere.
- Sound effects or music.
- Analytics or usage counting of games played (FR-025).
