import { describe, expect, it } from 'vitest';

import { buildQrMatrix, buildWifiQrPayload } from './qr';

// Test vectors from specs/004-guest-wifi/contracts/wifi-qr-payload.md.
describe('buildWifiQrPayload (contracts/wifi-qr-payload.md)', () => {
  it('encodes a plain WPA password with no escaping needed', () => {
    expect(
      buildWifiQrPayload({ ssid: 'Guest', password: 'simplepass', securityType: 'WPA' }),
    ).toBe('WIFI:T:WPA;S:Guest;P:simplepass;;');
  });

  it('escapes a semicolon in the password and a space in the ssid', () => {
    expect(
      buildWifiQrPayload({ ssid: 'Lobby Guest', password: 'p@ss;word', securityType: 'WPA' }),
    ).toBe('WIFI:T:WPA;S:Lobby Guest;P:p@ss\\;word;;');
  });

  it('omits the P: field entirely for an open (nopass) network', () => {
    expect(
      buildWifiQrPayload({ ssid: 'Open-Net', password: '', securityType: 'nopass' }),
    ).toBe('WIFI:T:nopass;S:Open-Net;;');
  });

  it('escapes a quote and a backslash, backslash first so nothing double-escapes', () => {
    expect(
      buildWifiQrPayload({ ssid: 'A"B\\C', password: 'x', securityType: 'WPA' }),
    ).toBe('WIFI:T:WPA;S:A\\"B\\\\C;P:x;;');
  });
});

describe('buildQrMatrix', () => {
  it('returns a square boolean matrix with no built-in border (research R1 T001 note)', () => {
    const matrix = buildQrMatrix('WIFI:T:WPA;S:Guest;P:simplepass;;');

    expect(matrix.length).toBeGreaterThan(0);
    for (const row of matrix) {
      expect(row).toHaveLength(matrix.length);
    }
    // With border: 0, the very first module is real QR data (a finder
    // pattern corner), which is always dark — proof the library's own
    // 1-module default border was actually suppressed.
    expect(matrix[0]?.[0]).toBe(true);
  });

  it('produces a larger matrix for a longer payload', () => {
    const short = buildQrMatrix('WIFI:T:nopass;S:A;;');
    const long = buildQrMatrix(
      `WIFI:T:WPA;S:${'A'.repeat(32)};P:${'B'.repeat(63)};;`,
    );
    expect(long.length).toBeGreaterThan(short.length);
  });
});
