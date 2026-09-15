import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider, useKiosk } from '../../context/KioskContext';
import BoardAgenda from './BoardAgenda';
import { agenda } from './agenda.static';
import { agendaStrings } from './strings';

/**
 * Behaviour of the tab itself. The scheduling maths lives in agenda.test.ts;
 * what is asserted here is the accordion contract - one row open at a time,
 * the right ARIA state on the control, and the panel folding itself back up
 * when the visitor walks away.
 *
 * The clock is faked so "now" is a fixed 13:30 - inside the AI keynote - rather
 * than whatever time the suite happens to run at, which would otherwise make
 * the live/ended assertions pass or fail by time of day.
 */

const AT_1330 = new Date(2026, 8, 15, 13, 30, 0);

function renderAgenda(props: { attractAfterSeconds?: number } = {}) {
  return render(
    <KioskProvider attractAfterSeconds={props.attractAfterSeconds ?? 30}>
      <BoardAgenda />
    </KioskProvider>,
  );
}

/**
 * Stands in for the shell's LanguageToggle.
 *
 * The real control lives in the app chrome, which this tab does not render and
 * must not import (Constitution IX) - so the locale is flipped through the same
 * public context the toggle uses, rather than by mounting the whole shell.
 */
function LocaleSwitch() {
  const { toggleLocale } = useKiosk();
  return (
    <button type="button" data-testid="locale-switch" onClick={toggleLocale}>
      switch
    </button>
  );
}

/** The row toggle for a session, found by its visible title. */
function sessionButton(titleEn: string) {
  return screen.getByRole('button', { name: new RegExp(titleEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
}

const KEYNOTE = 'Keynote: AI Strategy & Roadmap';
const OPENING = 'Opening & Strategic Review';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(AT_1330);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BoardAgenda rows', () => {
  it('renders every session as a collapsed toggle', () => {
    renderAgenda();

    for (const session of agenda.sessions) {
      const button = sessionButton(session.title.en);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('expands a session on tap and exposes its detail panel', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda();

    const keynote = agenda.sessions.find((x) => x.id === 'ai-keynote')!;
    expect(screen.queryByText(keynote.description!.en)).not.toBeVisible();

    await user.click(sessionButton(KEYNOTE));

    expect(sessionButton(KEYNOTE)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(keynote.description!.en)).toBeVisible();

    // Duration is computed, not authored: 13:00-14:15 is 1 h 15 min.
    const panel = screen.getByRole('region', { name: new RegExp(KEYNOTE.slice(0, 20)) });
    expect(within(panel).getByText('1 h 15 min')).toBeVisible();

    for (const topic of keynote.topics!) {
      expect(within(panel).getByText(topic.en)).toBeVisible();
    }
  });

  it('collapses the same session on a second tap', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda();

    await user.click(sessionButton(KEYNOTE));
    await user.click(sessionButton(KEYNOTE));

    expect(sessionButton(KEYNOTE)).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps only one session open at a time', async () => {
    // Accordion, not independent toggles: the panel has a fixed height budget,
    // so two open rows would leave neither with room to read.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda();

    await user.click(sessionButton(KEYNOTE));
    await user.click(sessionButton(OPENING));

    expect(sessionButton(OPENING)).toHaveAttribute('aria-expanded', 'true');
    expect(sessionButton(KEYNOTE)).toHaveAttribute('aria-expanded', 'false');

    const expanded = screen
      .getAllByRole('button')
      .filter((el) => el.getAttribute('aria-expanded') === 'true');
    expect(expanded).toHaveLength(1);
  });

  it('points each toggle at the panel it controls', () => {
    renderAgenda();

    for (const session of agenda.sessions) {
      const button = sessionButton(session.title.en);
      const panelId = button.getAttribute('aria-controls')!;
      expect(document.getElementById(panelId)).not.toBeNull();
    }
  });

  it('folds the open session away when the kiosk drifts into attract mode', async () => {
    // A row a visitor opened is their transient state; attract mode means they
    // have gone. Without this the kiosk shows one open and four squashed rows
    // to an empty lobby all night.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAgenda({ attractAfterSeconds: 2 });

    await user.click(sessionButton(KEYNOTE));
    expect(sessionButton(KEYNOTE)).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(sessionButton(KEYNOTE)).toHaveAttribute('aria-expanded', 'false');
  });

  it('localizes the detail panel, which is only reachable behind a tap', async () => {
    // SC-003 checks every VISIBLE string, and the detail copy is invisible
    // until a row is open - so it is exactly the text a language sweep of the
    // rendered page would miss.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <KioskProvider>
        <LocaleSwitch />
        <BoardAgenda />
      </KioskProvider>,
    );

    await user.click(sessionButton(KEYNOTE));
    const keynote = agenda.sessions.find((x) => x.id === 'ai-keynote')!;
    const panelEn = screen.getByRole('region', { name: new RegExp(KEYNOTE.slice(0, 20)) });

    expect(within(panelEn).getByText(agendaStrings.en.topicsLabel)).toBeVisible();
    expect(within(panelEn).getByText(agendaStrings.en.durationLabel)).toBeVisible();
    expect(within(panelEn).getByText(keynote.description!.en)).toBeVisible();

    await user.click(screen.getByTestId('locale-switch'));

    const panelHu = screen.getByRole('region', {
      name: new RegExp(keynote.title.hu.slice(0, 20)),
    });
    expect(within(panelHu).getByText(agendaStrings.hu.topicsLabel)).toBeVisible();
    expect(within(panelHu).getByText(agendaStrings.hu.durationLabel)).toBeVisible();
    expect(within(panelHu).getByText(keynote.description!.hu)).toBeVisible();
    expect(within(panelHu).queryByText(keynote.description!.en)).not.toBeInTheDocument();
  });
});

describe('BoardAgenda day-boundary notice', () => {
  it('says when the day begins before the first session', () => {
    vi.setSystemTime(new Date(2026, 8, 15, 7, 15, 0));
    renderAgenda();

    expect(
      screen.getByText(agendaStrings.en.dayNotStarted.replace('{time}', '09:00')),
    ).toBeVisible();
  });

  it('says the day is over after the last session', () => {
    vi.setSystemTime(new Date(2026, 8, 15, 21, 0, 0));
    renderAgenda();

    expect(screen.getByText(agendaStrings.en.dayEnded)).toBeVisible();
  });

  it('shows no notice while the summit is running', () => {
    // 13:30 is mid-keynote; the Now/Up next badges already carry the state.
    renderAgenda();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows no notice during a gap between sessions', () => {
    // 12:30 sits between the finance session and the keynote. A lull is not
    // the end of the day.
    vi.setSystemTime(new Date(2026, 8, 15, 12, 30, 0));
    renderAgenda();

    expect(screen.queryByText(agendaStrings.en.dayEnded)).not.toBeInTheDocument();
  });
});
