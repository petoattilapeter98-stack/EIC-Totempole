import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { TABS } from '../../tabs/registry';
import { ContentRegion } from '../ContentRegion/ContentRegion';
import { TabNav } from './TabNav';

function renderNav() {
  return render(
    <KioskProvider>
      <TabNav />
      <ContentRegion />
    </KioskProvider>,
  );
}

const selected = () => screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');

describe('TabNav', () => {
  it('renders one tab per registry entry (FR-011)', () => {
    renderNav();
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
  });

  it('marks Board Agenda active on first render (FR-015)', () => {
    renderNav();
    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toHaveAccessibleName(/Board Agenda/);
  });

  it('keeps exactly one tab selected through repeated switching (FR-012)', async () => {
    const user = userEvent.setup();
    renderNav();

    for (const { meta } of TABS) {
      await user.click(screen.getByRole('tab', { name: new RegExp(meta.label.en) }));
      expect(selected()).toHaveLength(1);
      expect(selected()[0]).toHaveAccessibleName(new RegExp(meta.label.en));
    }
  });

  it('updates the content region inline with that tab\'s own placeholder (FR-013, FR-014)', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('tab', { name: /Local Transit/ }));

    expect(
      screen.getByRole('heading', { name: 'Local Transit' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Board Agenda' })).not.toBeInTheDocument();
  });

  it('supports arrow-key navigation with roving tabindex (Constitution VII)', async () => {
    const user = userEvent.setup();
    renderNav();

    const tabs = screen.getAllByRole('tab');
    tabs[0]?.focus();
    const lastTabLabel = TABS[TABS.length - 1]!.meta.label.en;

    await user.keyboard('{ArrowRight}');
    expect(selected()[0]).toHaveAccessibleName(/Local Transit/);

    await user.keyboard('{End}');
    expect(selected()[0]).toHaveAccessibleName(new RegExp(lastTabLabel));

    await user.keyboard('{Home}');
    expect(selected()[0]).toHaveAccessibleName(/Board Agenda/);

    // Wraps backwards from the first tab.
    await user.keyboard('{ArrowLeft}');
    expect(selected()[0]).toHaveAccessibleName(new RegExp(lastTabLabel));
  });

  it('gives only the active tab a positive tabindex', () => {
    renderNav();
    const tabs = screen.getAllByRole('tab');

    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('wires aria-controls to the rendered panel', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('tab', { name: /Guest Wi-Fi/ }));

    const tab = selected()[0];
    const panel = screen.getByRole('tabpanel');
    expect(tab?.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tab?.getAttribute('id'));
  });
});
