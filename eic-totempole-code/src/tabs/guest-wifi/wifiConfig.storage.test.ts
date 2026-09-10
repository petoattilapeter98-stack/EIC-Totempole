import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  loadStoredConfig,
  saveConfigOverride,
  validateConfigInput,
} from './wifiConfig.storage';
import type { GuestNetworkConfig } from './wifiConfig.static';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('validateConfigInput', () => {
  it('accepts a valid WPA network', () => {
    expect(
      validateConfigInput({ ssid: 'Guest', password: 'simplepass', securityType: 'WPA' }),
    ).toEqual({});
  });

  it('accepts a valid open network regardless of password content', () => {
    expect(
      validateConfigInput({ ssid: 'Guest', password: '', securityType: 'nopass' }),
    ).toEqual({});
  });

  it('rejects an empty ssid', () => {
    expect(
      validateConfigInput({ ssid: '', password: 'simplepass', securityType: 'WPA' }),
    ).toHaveProperty('ssid');
  });

  it('rejects an ssid over 32 bytes', () => {
    expect(
      validateConfigInput({ ssid: 'A'.repeat(33), password: 'simplepass', securityType: 'WPA' }),
    ).toHaveProperty('ssid');
  });

  it('rejects a WPA password shorter than 8 characters', () => {
    expect(
      validateConfigInput({ ssid: 'Guest', password: 'short', securityType: 'WPA' }),
    ).toHaveProperty('password');
  });

  it('rejects a WPA password longer than 63 characters', () => {
    expect(
      validateConfigInput({ ssid: 'Guest', password: 'x'.repeat(64), securityType: 'WPA' }),
    ).toHaveProperty('password');
  });

  it('does not flag the password field for an open network even if empty', () => {
    expect(
      validateConfigInput({ ssid: 'Guest', password: '', securityType: 'nopass' }),
    ).not.toHaveProperty('password');
  });
});

describe('loadStoredConfig / saveConfigOverride', () => {
  it('returns null when nothing has been saved yet', () => {
    expect(loadStoredConfig()).toBeNull();
  });

  it('round-trips a saved config', () => {
    const config: GuestNetworkConfig = {
      ssid: 'Lobby Guest',
      password: 'letmein123',
      securityType: 'WPA',
    };
    saveConfigOverride(config);
    expect(loadStoredConfig()).toEqual(config);
  });

  it('ignores corrupt JSON in storage rather than throwing', () => {
    localStorage.setItem('eic-totempole:guest-wifi-config', '{not json');
    expect(loadStoredConfig()).toBeNull();
  });

  it('ignores a stored value that no longer passes validation', () => {
    localStorage.setItem(
      'eic-totempole:guest-wifi-config',
      JSON.stringify({ ssid: '', password: 'x', securityType: 'WPA' }),
    );
    expect(loadStoredConfig()).toBeNull();
  });

  it('ignores a stored value with the wrong shape', () => {
    localStorage.setItem('eic-totempole:guest-wifi-config', JSON.stringify({ foo: 'bar' }));
    expect(loadStoredConfig()).toBeNull();
  });
});
