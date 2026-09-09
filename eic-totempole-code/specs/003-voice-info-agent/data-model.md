# Phase 1 Data Model: Voice Information Assistant

## Note on spec entities vs. this codebase

spec.md's Key Entities section (Voice Query, Assistant Response, Knowledge Domain, Conversation Session, Employee Profile) describes the *conceptual* shape of the assistant's behavior. Per plan.md's delegation decision, all of that behavior — recognition, domain routing, answer generation, and the approved employee dataset — is realized entirely **inside** the embedded Copilot Studio agent, which this codebase treats as an opaque third party. None of those five entities are stored, modeled, or transmitted by this codebase. The only state this feature owns locally is the small set below, which governs the tab's own UI lifecycle.

## Local Entities

### AgentPanelState

The tab's own view-state machine — everything this codebase needs to know about the assistant tab.

| Field | Type | Notes |
|---|---|---|
| `status` | `'idle' \| 'active'` | `idle`: example prompts + Start button shown, embed not mounted. `active`: embed mounted, Start button replaced by an "End" control. |

**Transitions**:

- `idle → active`: visitor taps the Start button (FR-002, FR-004 as reinterpreted in plan.md).
- `active → idle`: visitor taps End (FR-008), OR the component unmounts because the visitor switched tabs, OR the idle auto-reset fires (FR-012) and returns the shell to Board Agenda, unmounting this tab entirely.
- On re-entering the tab after any `active → idle` transition via unmount, the component remounts fresh at `idle` — there is no persisted "last state," which is what gives FR-012's clearing guarantee for free (research.md R6).

No transition is stored outside React component state; nothing here is written to `localStorage`, a cookie, or any backend, consistent with spec 001's "Storage: N/A" precedent.

### ExamplePrompt

Static, localized content satisfying FR-016 (discoverability). Authored data, not runtime state.

| Field | Type | Notes |
|---|---|---|
| `domain` | `'innovation-centre' \| 'company' \| 'employees'` | Matches spec.md's three Knowledge Domains, for authoring traceability only — this codebase does not enforce or route on this value; it only labels which example belongs to which domain so FR-016/SC-007 ("at least one example per domain") is visibly satisfied. |
| `text` | `LocalizedText` (`{ en: string; hu: string }`) | The example question shown to the visitor, e.g. "What programs does the Innovation Centre run?" |

At least one `ExamplePrompt` per domain MUST exist (three minimum), per FR-016 and SC-007.

### Sign-In Session (not modeled by this codebase — noted for completeness)

spec.md's Sign-In Session entity (the Microsoft account authentication state that authorizes the assistant to answer at all) is held entirely by Microsoft's identity platform and the embedded Bot Framework Web Chat connection — this codebase has no field, variable, or storage key representing it, and cannot inspect whether it exists or has expired (the iframe is opaque and, per research.md R10/R11, cross-origin). `AgentPanelState` does not gain a third status for "signed in" vs. "not signed in" because this app cannot observe that distinction; the `signInHint` string (strings.ts) is shown unconditionally whenever `status === 'active'`, regardless of actual auth state, precisely because there is no signal available to condition it on. This is a deliberate consequence of embedding a vendor-hosted page rather than a bug or an oversight.

### AgentEmbedSnippet (build-time asset, not a runtime entity)

The pending Copilot Studio-provided HTML/script. Not a data structure this app models at runtime — it is a source file (`AgentEmbedContainer`'s real implementation, replacing the stub) governed by `contracts/agent-embed-contract.md`. Listed here only so its absence today is traceable to a concrete, named artifact rather than an open-ended gap.

## Relationships

```text
AgentPanelState (1) ──renders, when idle──> ExamplePrompt (3+, one per domain)
AgentPanelState (1) ──renders, when active──> AgentEmbedContainer ──mounts──> AgentEmbedSnippet (pending)
```

No entity here has a relationship to spec 001's `KioskState` beyond reading `locale` (for `ExamplePrompt`/button text) and `activeTab` (to know whether this tab is even mounted) — both already exposed by `useKiosk()`. This feature does not add any field to `KioskState` itself; `resetInteractionState` (spec 001) is unchanged and continues to only reset `activeTab`, which is what tears this feature's local state down via unmount.
