# Contract: View States & Idle Activity

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R3, R5, R6

Two things live here: the display-state machine, and the bridge that stops the kiosk resetting a
visitor mid-pan. The second is the one that will break if someone "simplifies" it.

---

## 1. Display states

| State | Layout | Controls present |
|-------|--------|------------------|
| `default` | Map box + companion list inside the content region; header, hero, nav, footer all visible | Expand control |
| `expanded` | `position: fixed; inset: 0` over the whole 1920x1280 viewport; companion list hidden (FR-029) | Return control |

### Rules

| ID | Rule | Requirement |
|----|------|-------------|
| S1 | `default` is the state on every mount. Expansion never persists across entries. | FR-011, FR-024 |
| S2 | The expanded element stays in the module's React subtree — **no portal, no `<dialog>`, no `role="dialog"`** | Principle IV |
| S3 | The return control is always visible while expanded — never auto-hiding, fading, or gesture-only | FR-025, FR-026 |
| S4 | Both controls meet ≥64px target / ≥16px separation using `--touch-target-min` and `--touch-gap-min` | Principle III |
| S5 | Both controls carry localized accessible names | FR-018, FR-019 |
| S6 | On expand, focus moves to the return control; on collapse, focus returns to the expand control | Principle VII |
| S7 | **No focus trap.** A trap would make it a modal in all but name. | Principle IV |
| S8 | Neither state may scroll the page, at 8 restaurants, longest names, both locales | Principle II, FR-009 |

**Why no portal (S2)**: portalling to `document.body` would take the element out of the feature's DOM
subtree, weakening Principle IX's removability and making the state read as a dialog. `position:
fixed` achieves the same visual result while the element remains a child of the tab module.

---

## 2. Idle-activity bridge

**The problem this exists to solve**: `useIdleReset` listens on `document`. Pointer events inside a
cross-origin iframe never reach the parent document. Without this bridge, a visitor panning the map
is reset to Board Agenda after 60 seconds of active use.

### Mechanism

```text
while the map tab is mounted:
  every MAP_FOCUS_POLL_MS (1000ms):
    if document.activeElement === <the map iframe>
       and secondsSinceMount < MAX_MAP_SESSION_SECONDS:
         signal activity through the public useKiosk() reset path
```

### Rules

| ID | Rule | Requirement |
|----|------|-------------|
| A1 | Exactly **one** interval per mount. Created on mount, cleared on unmount. | Principle V |
| A2 | Activity is signalled through the **public** `useKiosk()` surface — never by touching `useIdleReset` internals or dispatching synthetic events at `document` | Principle IX |
| A3 | Extension is capped at `MAX_MAP_SESSION_SECONDS` (600s = the spec's 10 minutes). After the ceiling, idle reset proceeds regardless of focus. | **FR-036**, Principle V |
| A4 | The poll does no work and holds no reference when the tab is unmounted | Principle V |
| A5 | No state accumulates across mount/unmount cycles | Principle V |

The ceiling is now a specified product behaviour (FR-036), not a plan-side safety margin — FR-012
was reworded during the post-plan clarification to drop its unachievable "never".

### Why the ceiling is mandatory, not defensive padding

Focus does **not** reliably clear when a visitor walks away from a kiosk. Without A3, "the iframe is
focused" would count as activity indefinitely and the kiosk would never idle-reset — it would sit on
one visitor's map view for days, with no operator to notice. That is precisely the unattended-decay
failure Principle V exists to prevent.

The ceiling converts an unbounded failure into a bounded one: at worst, the kiosk holds a map view
for 10 minutes longer than it should.

**If you are tempted to remove the ceiling because it seems redundant — it is the entire reason this
mechanism is constitutionally acceptable.**

---

## 3. Interaction with attract mode

Attract mode (30s) and idle reset (60s) both continue to work normally. The bridge extends the idle
deadline, which also postpones attract — correct, since a visitor working the map is present.

At the `MAX_MAP_SESSION_SECONDS` ceiling, normal behaviour resumes: attract engages, then idle reset
unmounts the tab and returns to Board Agenda, collapsing any expanded state (FR-011).

**The map view takes no exemption from attract mode** (FR-035). When attract engages, the map dims
with the rest of the chrome in *both* display states — the expanded state renders inside the content
region, so it inherits the fade. This was decided explicitly rather than by omission: consistency
with every other destination was preferred over a map-only carve-out, accepting that a visitor
reading passively for 30 seconds may need one tap to restore full legibility. Do not add a
`.recede` opt-out for this feature.

---

## 4. Test obligations

| What | Project | Asserts |
|------|---------|---------|
| Focus extends the session | `unit` (fake timers, faked `activeElement`) | A2, FR-012 |
| Ceiling ends extension | `unit` | A3 |
| Unmount clears the interval | `unit` | A1, A4, Principle V |
| Repeated mount/unmount leaks nothing | `unit` | A5, SC-008 |
| No page scroll in both states, 8 entries, both locales | `layout` (real Chromium, 1920x1280) | S8, SC-004, SC-016 |
| Both controls meet 64px / 16px | `layout` | S4, SC-009 |
| Focus moves on expand and collapse | `unit` | S6 |

jsdom has no layout engine and no real iframe focus model, so S4 and S8 **must** run in the `layout`
project — asserting them in jsdom would pass vacuously and give a false green on the constitution's
most important guarantee.
