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
 * (embed-mounted) state specifically, since the generic per-tab loop there
 * only ever exercises each tab's idle render.
 *
 * Deliberately does NOT wait for the embedded iframe to finish loading --
 * this asserts on CSS box geometry (a replaced element's box does not grow
 * with its content), not on the live third-party page, so it stays fast and
 * network-independent.
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

  it('does not scroll once the embed is mounted (FR-006, active state)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
    await user.click(
      screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }),
    );

    expect(screen.getByTitle(meta.label.en)).toBeInTheDocument();
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

    const endButton = screen.getByRole('button', { name: voiceAssistantStrings.en.endButton });
    const endRect = endButton.getBoundingClientRect();
    expect(endRect.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(endRect.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
