import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GuestWifiPanel } from './GuestWifi';
import { STRINGS } from './strings';
import type { GuestNetworkConfig } from './wifiConfig.static';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * Runs in REAL Chromium at the 1920x1280 design viewport (see
 * RestaurantMap.browser.test.tsx for why jsdom cannot make these assertions).
 *
 * `GuestWifiPanel` is rendered directly with fixture configs, not through the
 * live `WIFI_CONFIG` placeholder (which is intentionally unconfigured —
 * research R7) — this is what makes the worst-case (32/63-char) and
 * fallback states both testable without mocking a static module.
 */

const WORST_CASE: GuestNetworkConfig = {
  // 32 bytes — the real IEEE 802.11 SSID ceiling (research R6).
  ssid: 'A'.repeat(32),
  // 63 characters — the real WPA/WPA2 passphrase ceiling.
  password: 'B'.repeat(63),
  securityType: 'WPA',
};

const UNCONFIGURED: GuestNetworkConfig = { ssid: '', password: '', securityType: 'WPA' };

const MIN_TOUCH_TARGET = 64;

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

/** `.root`'s `height: 100%` needs a sized ancestor — this stands in for the
 * content region's `1fr` grid row, which is always viewport-sized in practice. */
function renderInViewportContainer(config: GuestNetworkConfig, locale: 'en' | 'hu') {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.inset = '0';
  document.body.appendChild(wrapper);
  return render(<GuestWifiPanel config={config} locale={locale} onSave={() => {}} />, {
    container: wrapper,
  });
}

describe('Guest Wi-Fi panel layout at 1920x1280', () => {
  it.each(['en', 'hu'] as const)(
    'never scrolls with the worst-case 32/63-character credentials (%s)',
    (locale) => {
      renderInViewportContainer(WORST_CASE, locale);
      expectNoOverflow(`configured panel, ${locale}`);
    },
  );

  it.each(['en', 'hu'] as const)('never scrolls in the not-configured fallback state (%s)', (locale) => {
    renderInViewportContainer(UNCONFIGURED, locale);
    expectNoOverflow(`fallback panel, ${locale}`);
  });

  it.each(['en', 'hu'] as const)('never scrolls in the editor, with the worst-case credentials pre-filled (%s)', async (locale) => {
    const user = userEvent.setup();
    renderInViewportContainer(WORST_CASE, locale);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel[locale] }));
    expectNoOverflow(`editor, ${locale}`);
  });

  it('gives the Edit button a 64px touch target', () => {
    renderInViewportContainer(WORST_CASE, 'en');
    const box = screen.getByRole('button', { name: STRINGS.editButtonLabel.en }).getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('gives Save, Cancel, and both security-type buttons a 64px touch target', async () => {
    const user = userEvent.setup();
    renderInViewportContainer(WORST_CASE, 'en');
    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));

    const buttons = [
      screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }),
      screen.getByRole('button', { name: STRINGS.cancelButtonLabel.en }),
      screen.getByRole('button', { name: STRINGS.securityWpaLabel.en }),
      screen.getByRole('button', { name: STRINGS.securityOpenLabel.en }),
    ];
    for (const button of buttons) {
      const box = button.getBoundingClientRect();
      expect(box.height, button.textContent ?? '').toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });
});
