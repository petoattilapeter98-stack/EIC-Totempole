import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider, useKiosk } from './KioskContext';

function Probe() {
  const { activeTab, setActiveTab, locale, toggleLocale, resetInteractionState } = useKiosk();
  return (
    <div>
      <span data-testid="tab">{activeTab}</span>
      <span data-testid="locale">{locale}</span>
      <button type="button" onClick={() => setActiveTab('guest-wifi')}>
        go wifi
      </button>
      <button type="button" onClick={toggleLocale}>
        toggle locale
      </button>
      <button type="button" onClick={resetInteractionState}>
        reset
      </button>
    </div>
  );
}

describe('KioskContext', () => {
  it('starts on Board Agenda in English (FR-015)', () => {
    render(
      <KioskProvider>
        <Probe />
      </KioskProvider>,
    );

    expect(screen.getByTestId('tab')).toHaveTextContent('board-agenda');
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('changes the active tab', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <Probe />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'go wifi' }));

    expect(screen.getByTestId('tab')).toHaveTextContent('guest-wifi');
  });

  it('resetInteractionState restores Board Agenda but LEAVES LOCALE UNCHANGED', async () => {
    // The single most likely misreading of FR-019: "clears any entered data"
    // reads as "reset everything", but the spec's Assumptions explicitly
    // exclude locale — it is a display setting, not visitor-entered data.
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <Probe />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    await user.click(screen.getByRole('button', { name: 'go wifi' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('hu');
    expect(screen.getByTestId('tab')).toHaveTextContent('guest-wifi');

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByTestId('tab')).toHaveTextContent('board-agenda');
    expect(screen.getByTestId('locale')).toHaveTextContent('hu');
  });

  it('keeps the locale across tab switches (FR-006)', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <Probe />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    await user.click(screen.getByRole('button', { name: 'go wifi' }));

    expect(screen.getByTestId('locale')).toHaveTextContent('hu');
  });

  it('syncs <html lang> with the selected locale', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <Probe />
      </KioskProvider>,
    );

    expect(document.documentElement.lang).toBe('en');
    await user.click(screen.getByRole('button', { name: 'toggle locale' }));
    expect(document.documentElement.lang).toBe('hu');
  });
});

describe('KioskContext idle integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns to Board Agenda when the idle countdown expires (FR-019)', () => {
    render(
      <KioskProvider idleTimeoutSeconds={5}>
        <Probe />
      </KioskProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'go wifi' }).click();
    });
    expect(screen.getByTestId('tab')).toHaveTextContent('guest-wifi');

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByTestId('tab')).toHaveTextContent('board-agenda');
  });
});
