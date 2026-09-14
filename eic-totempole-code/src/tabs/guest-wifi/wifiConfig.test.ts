import { describe, expect, it } from 'vitest';

import { WIFI_CONFIG, type GuestNetworkConfig } from './wifiConfig.static';

/**
 * Validation rules 1-4 from specs/004-guest-wifi/data-model.md §1, checked
 * both against the live config (so a bad edit fails `npm test` per the
 * procedure in wifiConfig.static.ts) and against representative fixtures (so
 * the rules themselves stay correct independent of whatever the config
 * currently holds).
 */
function assertValid(config: GuestNetworkConfig) {
  // Rule 1: ssid is 0 (not configured) or 1-32 bytes.
  const ssidLength = new TextEncoder().encode(config.ssid).length;
  expect(ssidLength === 0 || (ssidLength >= 1 && ssidLength <= 32)).toBe(true);

  // Rules 2 & 3 apply only to a configured network — an empty ssid means
  // password/securityType are unused placeholders (data-model.md §1 note).
  if (config.ssid === '') return;

  if (config.securityType === 'nopass') {
    expect(config.password).toBe('');
  } else {
    expect(config.password.length).toBeGreaterThanOrEqual(8);
    expect(config.password.length).toBeLessThanOrEqual(63);
  }
}

describe('WIFI_CONFIG (the live static config)', () => {
  it('satisfies every validation rule, including in its placeholder state', () => {
    assertValid(WIFI_CONFIG);
  });

  it('is frozen so it cannot be mutated at runtime', () => {
    expect(Object.isFrozen(WIFI_CONFIG)).toBe(true);
  });
});

describe('validation rules (data-model.md §1)', () => {
  it('accepts an empty ssid as the "not configured" sentinel (rule 4, research R7)', () => {
    assertValid({ ssid: '', password: '', securityType: 'WPA' });
  });

  it('accepts a configured WPA network within the 1-32 / 8-63 bounds', () => {
    assertValid({ ssid: 'Guest', password: 'simplepass', securityType: 'WPA' });
    assertValid({ ssid: 'A'.repeat(32), password: 'B'.repeat(63), securityType: 'WPA' });
    assertValid({ ssid: 'A', password: 'B'.repeat(8), securityType: 'WPA' });
  });

  it('accepts an open network with an empty password', () => {
    assertValid({ ssid: 'Open-Net', password: '', securityType: 'nopass' });
  });

  it('rejects a WPA password shorter than 8 characters', () => {
    expect(() => assertValid({ ssid: 'Guest', password: 'short', securityType: 'WPA' })).toThrow();
  });

  it('rejects a WPA password longer than 63 characters', () => {
    expect(() =>
      assertValid({ ssid: 'Guest', password: 'x'.repeat(64), securityType: 'WPA' }),
    ).toThrow();
  });

  it('rejects an ssid longer than 32 bytes', () => {
    expect(() =>
      assertValid({ ssid: 'A'.repeat(33), password: 'simplepass', securityType: 'WPA' }),
    ).toThrow();
  });

  it('rejects a non-empty password on a nopass network', () => {
    expect(() =>
      assertValid({ ssid: 'Open-Net', password: 'shouldnotbehere', securityType: 'nopass' }),
    ).toThrow();
  });
});
