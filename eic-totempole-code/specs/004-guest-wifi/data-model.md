# Phase 1 Data Model: Guest Wi-Fi Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## 1. Guest Network Config

The entity this feature reads and (as of User Story 4) writes. **Two sources, one shape**:

1. **Static default** — `WIFI_CONFIG` in `wifiConfig.static.ts`, hand-edited and redeployed by
   whoever manages the kiosk's codebase (spec FR-004).
2. **Device-local override** — saved through the on-screen editor (spec FR-015–FR-019) into this
   kiosk's own `localStorage`, via `wifiConfig.storage.ts`. Not synced, not sent anywhere
   (research R8).

**Resolution rule**: `effectiveConfig = storedOverride ?? staticDefault`. This is computed once,
at mount, in the top-level `GuestWifi` component (not `GuestWifiPanel`, which only ever receives
an already-resolved `config` prop — see [contracts/config-editing.md](contracts/config-editing.md)
§1).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `ssid` | `string` | 1–32 bytes when configured; `''` means "not configured" (research R7) | Network name, shown verbatim in both locales (spec FR-006) |
| `password` | `string` | When `ssid !== ''`: 8–63 ASCII characters if `securityType === 'WPA'`, else `''`. Unconstrained when `ssid === ''` (not configured) | Never translated, never masked (spec Assumptions) |
| `securityType` | `'WPA' \| 'nopass'` | — | `'WPA'` covers WPA/WPA2/WPA3-Personal for QR-payload purposes (research R2); `'nopass'` is an open network. WEP is intentionally not offered — see Assumptions below |

```ts
export interface GuestNetworkConfig {
  readonly ssid: string;
  readonly password: string;
  readonly securityType: 'WPA' | 'nopass';
}
```

**Validation rules** (enforced by a unit test against the static module, mirroring
003-restaurant-map's `restaurants.test.ts` pattern — research R6):

1. `ssid.length` is `0` (not configured) or between `1` and `32` inclusive.
2. If `ssid !== ''` and `securityType === 'nopass'`, `password === ''`.
3. If `ssid !== ''` and `securityType === 'WPA'`, `password.length` is between `8` and `63`
   inclusive.
4. `ssid !== ''` XOR the panel is in the "not configured" fallback state (research R7) — i.e. an
   empty `ssid` is the only trigger for FR-014's fallback; there is no independent flag to drift
   out of sync with it.

**Note on rules 2–3 and the "not configured" state**: both are guarded by `ssid !== ''` because
when `ssid === ''` (research R7's sentinel), `password`/`securityType` are placeholder values with
no constraint of their own — the record is never used to build a QR payload or displayed credential
in that state (§2), so there is nothing for them to be valid *for*. Discovered while writing
`wifiConfig.test.ts`: the natural all-empty placeholder (`ssid: '', password: '', securityType:
'WPA'`) would otherwise fail rule 3 despite correctly signalling "not configured."

**State/lifecycle**: the static default (source 1) is a frozen module constant — no
create/update/delete, no persistence. The device-local override (source 2) has a real lifecycle
now: created or replaced wholesale by a Save in the editor (no partial update — the whole record
is written together, so a config on disk is never a mix of an old password and a new SSID), read
once per mount, never deleted through the UI (there is no "clear" action — see spec Edge Cases).
Neither is tied to any individual visitor (Key Entities).

## 1a. Config validation errors

Not a stored entity — the shape of feedback the on-screen editor shows inline, keyed by field:

```ts
interface ConfigValidationErrors {
  readonly ssid?: string;
  readonly password?: string;
}
```

Computed by `validateConfigInput()` in `wifiConfig.storage.ts`, applying rules 1–3 below with one
difference from the static config's own rules: the editor has no "not configured" sentinel to
save, so an empty `ssid` is always an error here, never a valid state (spec FR-017). See
[contracts/config-editing.md](contracts/config-editing.md) §2 for the exact rule text shown to
the operator.

## 2. Derived value: Wi-Fi QR payload

Not a stored entity — a pure function of the config above, recomputed (cheaply, synchronously) on
every render rather than cached, since the config never changes at runtime.

```ts
function buildWifiQrPayload(config: GuestNetworkConfig): string;
// e.g. { ssid: 'Guest', password: 'p@ss;word', securityType: 'WPA' }
//   → 'WIFI:T:WPA;S:Guest;P:p\@ss\;word;;'
```

See [contracts/wifi-qr-payload.md](contracts/wifi-qr-payload.md) for the exact escaping contract
(research R2). Given the empty-SSID sentinel (research R7), this function is only ever called once
`ssid !== ''` has already been confirmed by the component — it is not itself responsible for the
fallback decision.

## 3. Derived value: QR module matrix → SVG

Also not stored. `uqr`'s `encode(payload)` (research R1) returns a boolean matrix, which this
feature's own rendering code turns into the `<svg>` described in
[contracts/visual-theme.md](contracts/visual-theme.md) §2 — a light background plate sized to the
matrix plus the mandatory 4-module quiet zone, with one shape per dark module. Recomputed on mount;
never persisted, never sent anywhere.

## Assumptions carried from the spec

- **WEP is not offered as a `securityType` option.** The spec's Assumptions section scopes this
  feature to "the guest network" (singular, operator-configured); WEP is deprecated and
  cryptographically broken, so this data model does not provide a way to express it. If the guest
  network is ever WEP (it should not be), that is an infrastructure problem out of this feature's
  scope to encode.
- **No `hidden` (non-broadcast SSID) field.** The spec's Assumptions rule out anything beyond a
  single, straightforward guest network; a hidden network would need the `H:true` QR field and
  additional UI explanation, which nothing in the spec calls for.
