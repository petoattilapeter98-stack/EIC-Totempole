import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { App } from '../../app/App';
import { strings } from '../../i18n/strings';
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

/** The banner's collapse and return animate over 0.5s. */
const COLLAPSE_POLL = { timeout: 3000, interval: 50 };

/**
 * Geometry of the shell rows around the Welcome banner. The banner keeps its
 * natural height while collapsed (its wrapper clips it), so "collapsed" is
 * measured as the distance from header to nav, not the banner's own rect.
 */
function shellGeometry() {
  const header = document.querySelector('header')!;
  const shell = header.closest<HTMLElement>('[data-attract]')!;
  // getByText, unlike getByRole, still finds the banner once it is hidden.
  const hero = screen.getByText(strings.en.eventPill).closest('section')!;
  const nav = screen.getByRole('tablist');
  return {
    navOffset: nav.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
    panelHeight: screen.getByRole('tabpanel').getBoundingClientRect().height,
    // Layout height, not the rect: the rect includes attract mode's 1.03 scale,
    // which is still easing out just after the first tap.
    heroHeight: hero.offsetHeight,
    heroVisibility: getComputedStyle(hero).visibility,
    shellGap: parseFloat(getComputedStyle(shell).rowGap),
    isAttract: shell.dataset.attract === 'true',
  };
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

  it('collapses the Welcome banner while a conversation is open and gives its height to the transcript (2026-10-26 amendment)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
    const before = shellGeometry();
    expect(before.navOffset, 'banner sits between header and nav').toBeGreaterThan(
      before.heroHeight,
    );

    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }));

    // Exactly ONE shell gap left between header and nav - not the two that an
    // emptied grid row would leave behind.
    await expect
      .poll(() => shellGeometry().navOffset, COLLAPSE_POLL)
      .toBeLessThanOrEqual(before.shellGap + 1);
    await expect.poll(() => shellGeometry().heroVisibility, COLLAPSE_POLL).toBe('hidden');

    const collapsed = shellGeometry();
    expect(collapsed.navOffset).toBeGreaterThanOrEqual(before.shellGap - 1);
    expect(
      collapsed.panelHeight - before.panelHeight,
      'content region gains the banner height plus one gap',
    ).toBeGreaterThanOrEqual(before.heroHeight + before.shellGap - 1);
    expectNoOverflow('banner collapsed');

    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.endButton }));

    await expect
      .poll(() => Math.abs(shellGeometry().navOffset - before.navOffset), COLLAPSE_POLL)
      .toBeLessThanOrEqual(1);
    await expect.poll(() => shellGeometry().heroVisibility, COLLAPSE_POLL).toBe('visible');
    expect(Math.abs(shellGeometry().panelHeight - before.panelHeight)).toBeLessThanOrEqual(1);
    expectNoOverflow('banner restored after End');
  });

  it('brings the Welcome banner back in attract mode even with a conversation open', async () => {
    const user = userEvent.setup();
    render(
      // Shortened so the test reaches attract mode in seconds, not 60s.
      <KioskProvider attractAfterSeconds={2}>
        <App />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
    const open = shellGeometry();
    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }));

    await expect.poll(() => shellGeometry().isAttract, { timeout: 8000 }).toBe(true);
    // Attract transitions run at 1.4s.
    await expect
      .poll(() => Math.abs(shellGeometry().navOffset - open.navOffset), { timeout: 5000 })
      .toBeLessThanOrEqual(1);
    expect(shellGeometry().heroVisibility).toBe('visible');

    // The conversation is still there underneath - attract only overrides the
    // banner; ending the conversation is the idle reset's job.
    expect(screen.getByRole('button', { name: voiceAssistantStrings.en.endButton })).toBeInTheDocument();
    expectNoOverflow('attract with a conversation open');
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
