# Quickstart: Validating the Guest Wi-Fi Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Run this after implementation to confirm the feature works end-to-end. Steps 1–2 are one-time
setup; steps 3–11 are the actual validation and should be repeated after any change to
`src/tabs/guest-wifi/`.

## Prerequisites

- Node matching this repo's `package.json` engines (already required for `npm install`/`npm run
  dev` elsewhere in this project).
- A phone with a working camera, connected to any network (used only to scan the QR — it does not
  need to reach the guest network beforehand).
- The real guest network's SSID, password, and security type from whoever administers it.

## 1. Install the new dependency

```bash
npm install uqr
```

## 2. Configure the real network

Two ways to do this — either is fine, and the on-screen editor (added later, User Story 4) means
step 2 no longer strictly requires a code change:

- **In code**: edit `src/tabs/guest-wifi/wifiConfig.static.ts` and replace the placeholder values
  with the real guest network's `ssid`, `password`, and `securityType` (see
  [data-model.md](data-model.md) §1 for the exact shape and validation rules).
- **On screen**: skip this step, start the dev server (step 4), tap **Edit** on the panel, and
  enter the real network there instead — see step 11.

## 3. Run the automated checks

```bash
npm run typecheck
npm run test:unit    # qr.test.ts, wifiConfig.test.ts, GuestWifi.test.tsx
npm run test:layout  # no-scroll + touch targets at 1920x1280
```

All three MUST pass before manual validation. `test:unit` covers the payload-escaping contract
([contracts/wifi-qr-payload.md](contracts/wifi-qr-payload.md) test vectors), the SSID/password
length validation (data-model.md §1), and the empty-config fallback (research R7).

## 4. Start the kiosk and open the tab

```bash
npm run dev
```

Open the printed local URL, resize/emulate the browser to 1920x1280 (matching the constitution's
target viewport), and tap the **Guest Wi-Fi** tab in the nav bar.

**Expected**: the content region immediately shows the glowing QR panel, on the same light
surface every other tab uses — no page navigation, no flash of the previous tab's content, no
scrollbar. The header, hero, and nav bar stay in their normal light theme (FR-007).

## 5. Scan the QR code (User Story 1 / SC-001)

Point the phone's stock camera app at the QR code on screen.

**Expected**: within a couple of seconds the phone offers to join the configured network by name,
with no other prompt. Accept it and confirm the phone actually joins. Time the whole interaction —
SC-001 requires under 15 seconds from tapping the tab to a joined connection.

**Also check** (R3 / visual-theme.md §2): the QR code itself is plain black-on-white — the glow
surrounds the plate but never tints the code itself.

## 6. Read the manual fallback (User Story 2)

Without scanning anything, read the network name and password printed next to the QR code from a
normal standing distance (SC-002). Both must be legible without walking up to the screen. Type
them into a second device's Wi-Fi settings by hand and confirm it joins.

## 7. Toggle the language (User Story 3)

Tap the language control. **Expected**: "Scan to connect" / "Network name" / "Password"-style
labels switch between EN and HU; the SSID and password text is byte-for-byte identical in both
languages.

## 8. Confirm attract-mode dimming (FR-010)

Stop touching the kiosk and wait past the idle threshold (`ATTRACT_AFTER_SECONDS`, 30s in
`KioskContext.tsx`) while the Guest Wi-Fi panel is open.

**Expected**: the entire panel — glow included — fades to the same ~16% opacity every other tab
dims to. The glow animation is still running underneath (not paused) if you look closely at the
faded panel. Touch the screen again and confirm it returns to full brightness immediately.

## 9. Confirm the "not configured" fallback (FR-014)

Temporarily set `ssid: ''` in `wifiConfig.static.ts`, reload, and open the tab again.

**Expected**: a clear placeholder message, not a blank area, broken QR, or console error. Revert
the change afterward — do not ship this state.

## 10. Multi-day reliability spot-check (SC-004)

Leave the tab open (or cycling in and out via the nav) for as long as practical during a dev
session while watching the browser's performance/memory panel. **Expected**: no growing JS heap
across repeated mount/unmount cycles of this tab, and no console warnings about leaked timers
(there should be none registered by this feature at all — research R4).

## 11. Edit the network from the panel itself (User Story 4)

Tap **Edit** (top-right of the panel, visible whether or not a network is currently configured).

**Expected**: an inline form replaces the panel body — pre-filled with the current network if one
exists — with a network-name field, a WPA/Open toggle, a password field (hidden when Open is
selected), and Save/Cancel. No modal, no new page.

Try each of these, in order:

1. Clear the network name and tap Save. **Expected**: an inline error next to the field; nothing
   saves; you stay in the editor.
2. Enter a name, switch to a WPA password under 8 characters, tap Save. **Expected**: an inline
   error next to the password field; nothing saves.
3. Enter a valid name and password, tap Save. **Expected**: back to the normal display
   immediately, showing the new QR code and credentials — no page reload.
4. Reload the page and reopen the tab. **Expected**: the network you just saved is still shown
   (spec FR-018, Acceptance Scenario 5) — it was written to this browser's `localStorage`
   (contracts/config-editing.md §3), not lost on reload.
5. Tap Edit again, change something, tap **Cancel**. **Expected**: back to the normal display
   showing the *previous* (unedited) values — nothing was saved.
6. Tap Edit, select **Open network**, tap Save. **Expected**: the password field disappears
   before saving, and the panel afterward shows no password row (matches the existing
   nopass-network behaviour from step 6's manual-fallback check).

Revert to whatever network you want left configured afterward — this step's edits persist in
your browser's `localStorage` until changed again or that storage is cleared.
