import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../context/KioskContext';
import { strings } from '../i18n/strings';
import { TABS } from '../tabs/registry';
import { App } from './App';

function renderApp() {
  return render(
    <KioskProvider>
      <App />
    </KioskProvider>,
  );
}

/**
 * SC-009: switching the toggle changes 100% of the header, hero,
 * navigation-tab-label and footer text.
 */
describe('shell localization (FR-007, SC-009)', () => {
  it('renders every shell surface in English by default', () => {
    renderApp();

    expect(screen.getByText(strings.en.brandSubtitle)).toBeInTheDocument();
    expect(screen.getByText(strings.en.eventPill)).toBeInTheDocument();
    // Scoped to the hero heading: the accent string is identical to the brand
    // name in the header, so a bare getByText would match two elements.
    expect(
      screen.getByRole('heading', { name: new RegExp(strings.en.welcomeHeadline) }),
    ).toHaveTextContent(strings.en.welcomeHeadlineAccent);
    expect(screen.getByText(strings.en.footerHint)).toBeInTheDocument();

    for (const { meta } of TABS) {
      expect(screen.getByRole('tab', { name: new RegExp(meta.label.en) })).toBeInTheDocument();
    }
  });

  it('switches every shell surface to Hungarian when toggled', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: strings.en.languageToggleAria }));

    // Header
    expect(screen.getByText(strings.hu.brandSubtitle)).toBeInTheDocument();
    // Hero
    expect(screen.getByText(strings.hu.eventPill)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: new RegExp(strings.hu.welcomeHeadline) }),
    ).toHaveTextContent(strings.hu.welcomeHeadlineAccent);
    expect(screen.getByText(strings.hu.welcomeSublineEmphasis)).toBeInTheDocument();
    // Footer
    expect(screen.getByText(strings.hu.footerHint)).toBeInTheDocument();
    expect(screen.getByText(strings.hu.footerKioskLabel)).toBeInTheDocument();
    // All four nav labels
    for (const { meta } of TABS) {
      expect(screen.getByRole('tab', { name: new RegExp(meta.label.hu) })).toBeInTheDocument();
    }

    // And none of the English equivalents survive.
    expect(screen.queryByText(strings.en.brandSubtitle)).not.toBeInTheDocument();
    expect(screen.queryByText(strings.en.footerHint)).not.toBeInTheDocument();
  });

  it('keeps the selected language across tab switches (FR-006)', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: strings.en.languageToggleAria }));
    await user.click(screen.getByRole('tab', { name: new RegExp(TABS[1].meta.label.hu) }));

    expect(screen.getByText(strings.hu.footerHint)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: TABS[1].meta.label.hu }),
    ).toBeInTheDocument();
  });
});
