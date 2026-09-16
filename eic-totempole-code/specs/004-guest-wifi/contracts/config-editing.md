# Contract: On-Screen Config Editing

**Feature**: `004-guest-wifi` | **Consumers**: `GuestWifi.tsx`, `wifiConfig.storage.ts`

The contract for FR-015–FR-019 (User Story 4): how an operator sets or changes the guest network
directly at the kiosk, and how that edit is stored and resolved against the static default.

---

## 1. Component split and config resolution

```
GuestWifi (default export, no props)
  ├─ resolves effectiveConfig = loadStoredConfig() ?? WIFI_CONFIG   (once, at mount)
  ├─ holds effectiveConfig in React state
  ├─ onSave(next) → saveConfigOverride(next); setState(next)
  └─ renders <GuestWifiPanel config={effectiveConfig} locale={locale} onSave={onSave} />

GuestWifiPanel (named export, props: config, locale, onSave)
  ├─ purely presentational — never touches localStorage itself
  ├─ owns local UI state: isEditing (boolean)
  └─ renders the QR/credentials/fallback view, OR the edit form, never both
```

This split exists so `GuestWifiPanel` stays testable against any config fixture without touching
browser storage in tests — `wifiConfig.storage.ts`'s functions are unit-tested in isolation
instead (`wifiConfig.storage.test.ts`). `GuestWifi` itself is the only place `localStorage` is
read, and only once, at mount — there is no polling, no `useEffect` watching storage, nothing that
needs cleanup (Constitution V stays satisfied the same way research R4 established: nothing here
is a timer or subscription).

## 2. Validation

`validateConfigInput(input: GuestNetworkConfig): ConfigValidationErrors`, in
`wifiConfig.storage.ts`:

| Field | Rule | Error shown |
|---|---|---|
| `ssid` | 1–32 UTF-8 bytes (via `TextEncoder`, not `.length` — see data-model.md §1 for why byte length matters) | "Enter 1–32 characters." (localized) |
| `password` | 8–63 characters, **only checked when `securityType === 'WPA'`** | "Enter 8–63 characters." (localized) |

An empty `{}` return means valid. Unlike the static config's own validation
(`wifiConfig.test.ts`), there is **no exemption for an empty `ssid`** here — the editor has no way
to save "not configured," so an empty name is always rejected (spec FR-017, data-model.md §1a).

**When errors show**: only after the operator's first Save attempt (`showErrors` state), not
live while typing — so a blank password field doesn't show a red error before the operator has
had a chance to type anything. Once shown, errors update live as the operator corrects the field.

## 3. Storage

`wifiConfig.storage.ts` owns the `localStorage` key `eic-totempole:guest-wifi-config`
(namespaced per Constitution IX — no other feature may read or write it).

- `loadStoredConfig(): GuestNetworkConfig | null` — returns `null` if nothing is stored, the JSON
  is corrupt, or the parsed value no longer passes `validateConfigInput` (e.g. hand-edited
  devtools storage). Every failure mode degrades to "use the static default," never a thrown
  error or a broken panel.
- `saveConfigOverride(config): void` — writes the whole record as one JSON blob. Wrapped in
  try/catch: a `localStorage` write can throw (private browsing, quota, disabled storage); if it
  does, the edit still applies to the current in-memory session (via `GuestWifi`'s own state
  update) but will not survive a reload. This is a silent degrade by design — surfacing a storage
  error to the operator would need new UI (a toast, an alert) this feature does not otherwise
  have, for a failure mode narrow enough that "it didn't save, try again" is an acceptable
  recovery path.

Nothing here is a "secret in the client bundle" (Constitution VI): the value lives in this one
device's browser storage, set by an operator at that device, never shipped in the built JS/CSS
and never sent over the network (Constitution VIII stays satisfied for the same reason — this is
local computation and storage, not a backend).

## 4. Edit form UI

- **Password field is `type="text"`, not `type="password"`.** The panel already prints the
  password in plaintext for every visitor to read (spec Assumptions); masking it only while
  typing would add friction (and a "reveal" affordance to build) for zero actual privacy gain,
  since the same value is shown in the clear the moment the operator taps Save. This is a
  deliberate consistency choice, not an oversight.
- **Security type is a two-button toggle** (`role="group"`, `aria-pressed` on each option),
  matching this kiosk's existing button-driven interaction style rather than a native `<select>`.
  Selecting "Open network" clears `draft.password` and unmounts the password input entirely —
  there is nothing to fill in for an open network, so nothing is shown to fill in.
- **No access control.** Tapping Edit requires no PIN, confirmation, or staff unlock — see spec
  Assumptions for the reasoning and the condition under which this should be revisited.
- **Touch targets**: the Edit button, both security-type buttons, and Save/Cancel all meet the
  64px minimum (Constitution III) — asserted in `GuestWifi.browser.test.tsx`. Text inputs are
  also sized to the 64px minimum height for comfortable on-screen-keyboard interaction, though
  that is a usability choice, not a Constitution III requirement (inputs are not the kind of
  discrete tap target the principle is about).

## 5. What Save/Cancel do

- **Save**: validates the draft; if invalid, shows inline errors and stays in edit mode. If
  valid, calls `onSave(draft)` (which persists and updates the displayed config) and exits edit
  mode — back to the normal display, now showing the new values (spec FR-019).
- **Cancel**: exits edit mode without calling `onSave`. The draft is local `useState` inside the
  edit form component, discarded when it unmounts — there is nothing to explicitly "roll back."
