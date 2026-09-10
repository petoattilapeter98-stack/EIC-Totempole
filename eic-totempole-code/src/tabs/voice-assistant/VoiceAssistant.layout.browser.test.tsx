import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { App } from '../../app/App';
import { meta } from './meta';
import { voiceAssistantStrings } from './strings';

import '../../styles/tokens.css';
import '../../styles/fonts.css';
import '../../styles/reset.css';

/**
 * Runs in real Chromium at the 1920x1280 design viewport (see
 * src/app/App.layout.browser.test.tsx for why jsdom cannot make these
 * assertions). Extends that shell-level check to this tab's active
 * (conversation-mounted) state specifically, since the generic per-tab loop
 * there only ever exercises each tab's idle render.
 *
 * Tapping Start here does trigger a real (unmocked) call to Copilot Studio's
 * public token endpoint -- there is no env var or secret to withhold, since
 * agentConfig.DIRECT_LINE_PROVISION_TOKEN_URL is a public constant. This test
 * deliberately does NOT await that connection either way (same discipline as
 * the pre-2026-09-10 iframe-embed version of this file): the End button and
 * CSS box geometry it asserts on render immediately regardless of connection
 * outcome, so this test stays fast and does not flake on network conditions.
 */
const MIN_TOUCH_TARGET = 64;

function expectNoOverflow(label: string) {
  const el = document.documentElement;
  expect(el.scrollHeight, `${label}: vertical overflow`).toBeLessThanOrEqual(el.clientHeight);
  expect(el.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(el.clientWidth);
}

describe('Voice Assistant tab layout at 1920x1280', () => {
  it('does not scroll in the idle state (FR-006)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
    expectNoOverflow('voice-assistant idle');
  });

  it('does not scroll once the conversation panel is mounted (FR-006, active state)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }));

    expect(
      await screen.findByRole('button', { name: voiceAssistantStrings.en.endButton }),
    ).toBeInTheDocument();
    expectNoOverflow('voice-assistant active');
  });

  it('gives the Start and End controls at least a 64px touch target (Constitution III)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));

    const startButton = screen.getByRole('button', {
      name: voiceAssistantStrings.en.startButton,
    });
    const startRect = startButton.getBoundingClientRect();
    expect(startRect.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(startRect.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

    await user.click(startButton);

    const endButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.endButton,
    });
    const endRect = endButton.getBoundingClientRect();
    expect(endRect.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(endRect.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
