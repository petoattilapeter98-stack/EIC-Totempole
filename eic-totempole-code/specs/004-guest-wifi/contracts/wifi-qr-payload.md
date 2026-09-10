# Contract: Wi-Fi QR Payload

**Feature**: `004-guest-wifi` | **Consumers**: `GuestWifi.tsx`, `qr.ts`, `qr.test.ts`

The exact string this feature's QR code encodes, and the escaping rule that keeps it correct for
any legal SSID/password (research R2). This is the piece FR-002 depends on: get it wrong and the
QR code still renders and still scans, but joins the wrong network or a truncated password —
a failure invisible to every visual check.

---

## Format

```
WIFI:T:<securityType>;S:<ssid>;P:<password>;;
```

- `T` — `WPA` (covers WPA/WPA2/WPA3-Personal, per research R2) or `nopass`.
- `S` — the network name, escaped per the rule below.
- `P` — the password, escaped per the rule below. Omit the whole `P:...;` segment when
  `securityType === 'nopass'` (there is no password to encode).
- No `H:` field is ever emitted (data-model.md — hidden networks are out of scope).
- The string ends with `;;` (an empty final field, terminating the record) — this is the
  convention every mainstream scanner expects; omitting it is a common bug in hand-rolled
  implementations.

## Escaping rule

Before inserting `ssid` or `password` into the template, escape every occurrence of the following
characters with a single preceding backslash, **processing the backslash character itself first**
so an escape sequence is never re-escaped:

| Character | Escaped as |
|---|---|
| `\` | `\\` |
| `;` | `\;` |
| `,` | `\,` |
| `"` | `\"` |
| `:` | `\:` |

```ts
const ESCAPE_CHARS = /[\\;,":]/g;

function escapeWifiField(value: string): string {
  return value.replace(ESCAPE_CHARS, (char) => `\\${char}`);
}
```

## Reference implementation

```ts
export function buildWifiQrPayload(config: GuestNetworkConfig): string {
  const ssid = escapeWifiField(config.ssid);
  if (config.securityType === 'nopass') {
    return `WIFI:T:nopass;S:${ssid};;`;
  }
  const password = escapeWifiField(config.password);
  return `WIFI:T:WPA;S:${ssid};P:${password};;`;
}
```

Only ever called once the caller has confirmed `config.ssid !== ''` (data-model.md §1 rule 4) —
this function does not itself decide the FR-014 fallback state.

## Test vectors (`qr.test.ts` MUST assert these exactly)

| Input | Expected output |
|---|---|
| `{ ssid: 'Guest', password: 'simplepass', securityType: 'WPA' }` | `WIFI:T:WPA;S:Guest;P:simplepass;;` |
| `{ ssid: 'Lobby Guest', password: 'p@ss;word', securityType: 'WPA' }` | `WIFI:T:WPA;S:Lobby Guest;P:p@ss\;word;;` |
| `{ ssid: 'Open-Net', password: '', securityType: 'nopass' }` | `WIFI:T:nopass;S:Open-Net;;` |
| `{ ssid: 'A"B\\C', password: 'x', securityType: 'WPA' }` | `WIFI:T:WPA;S:A\"B\\C;P:x;;` |

## Non-goals

- This contract does not cover QR *rendering* (module colours, quiet zone, sizing) — see
  [visual-theme.md](visual-theme.md).
- This contract does not validate length/character-set legality of `ssid`/`password` — see
  data-model.md §1, enforced separately against `wifiConfig.static.ts`.
