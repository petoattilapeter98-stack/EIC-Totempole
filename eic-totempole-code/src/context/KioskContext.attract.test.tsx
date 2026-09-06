import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider, useKiosk } from './KioskContext';

function Probe() {
  const { isAttract, activeTab, locale, toggleLocale, setActiveTab } = useKiosk();
  return (
    <div>
      <span data-testid="attract">{String(isAttract)}</span>
      <span data-testid="tab">{activeTab}</span>
      <span data-testid="locale">{locale}</span>
      <button type="button" onClick={() => setActiveTab('guest-wifi')}>go wifi</button>
      <button type="button" onClick={toggleLocale}>toggle locale</button>
    </div>
  );
}

const attract = () => screen.getByTestId('attract').textContent;

function renderProvider() {
  return render(
    <KioskProvider idleTimeoutSeconds={10} attractAfterSeconds={5}>
      <Probe />
    </KioskProvider>,
  );
}

describe('attract mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is ON from boot, before anyone has touched it', () => {
    // Attract is the resting state. A kiosk that has just been powered on or
    // reloaded has never been touched, so it should already be showing its
    // ambient face rather than crisp UI to an empty lobby.
    renderProvider();
    expect(attract()).toBe('true');
  });

  it('stays on through the first idle period without any interaction', () => {
    renderProvider();

    act(() => { vi.advanceTimersByTime(2_000); });
    expect(attract()).toBe('true');
  });

  it('re-engages once the idle threshold passes after a touch', () => {
    renderProvider();

    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(250);
    });
    expect(attract()).toBe('false');

    act(() => { vi.advanceTimersByTime(4_000); });
    expect(attract()).toBe('false');

    act(() => { vi.advanceTimersByTime(1_500); });
    expect(attract()).toBe('true');
  });

  it('STAYS on across an auto-reset', () => {
    // The regression this whole design exists to prevent: the countdown
    // restarts itself every idleTimeoutSeconds, and if attract were derived
    // from it the display would flicker in and out of ambience forever with
    // nobody in the room.
    renderProvider();

    // Touch first, so attract is genuinely off and this test cannot pass just
    // because attract is on from boot.
    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(250);
    });
    expect(attract()).toBe('false');

    act(() => { vi.advanceTimersByTime(6_000); });
    expect(attract()).toBe('true');

    // Push well past two full auto-reset cycles with no further interaction.
    act(() => { vi.advanceTimersByTime(25_000); });
    expect(attract()).toBe('true');
  });

  it('exits immediately on a real touch', () => {
    renderProvider();

    act(() => { vi.advanceTimersByTime(6_000); });
    expect(attract()).toBe('true');

    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(250);
    });

    expect(attract()).toBe('false');
  });

  it('exits on a key press too', () => {
    renderProvider();

    act(() => { vi.advanceTimersByTime(6_000); });
    expect(attract()).toBe('true');

    act(() => {
      document.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(250);
    });

    expect(attract()).toBe('false');
  });

  it('re-engages after the visitor leaves again', () => {
    renderProvider();

    act(() => { vi.advanceTimersByTime(6_000); });
    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(250);
    });
    expect(attract()).toBe('false');

    act(() => { vi.advanceTimersByTime(6_000); });
    expect(attract()).toBe('true');
  });

  it('does not disturb tab or locale state', () => {
    renderProvider();

    act(() => { screen.getByRole('button', { name: 'toggle locale' }).click(); });
    act(() => { vi.advanceTimersByTime(6_000); });

    expect(attract()).toBe('true');
    // Attract is presentation only - it must not clear the visitor's language.
    expect(screen.getByTestId('locale')).toHaveTextContent('hu');
  });
});
