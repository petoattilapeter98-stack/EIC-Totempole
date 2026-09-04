import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { strings } from '../../i18n/strings';
import { HeaderBar } from './HeaderBar';
import { budapestWeather } from './weather.static';

function renderHeader() {
  return render(
    <KioskProvider>
      <HeaderBar />
    </KioskProvider>,
  );
}

describe('HeaderBar', () => {
  it('shows the brand name (FR-001)', () => {
    renderHeader();
    expect(
      screen.getByRole('heading', { name: new RegExp(strings.en.brandName) }),
    ).toBeInTheDocument();
  });

  it('exposes the live status non-visually, not by colour alone', () => {
    renderHeader();
    expect(screen.getByText(strings.en.statusLiveAria)).toBeInTheDocument();
  });

  it('shows the Budapest weather temperature and condition (FR-004)', () => {
    renderHeader();
    expect(screen.getByText(`${budapestWeather.tempC}°C`)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${strings.en.weatherCity}.*${budapestWeather.condition.en}`),
      ),
    ).toBeInTheDocument();
  });

  it('renders a machine-readable clock (FR-002, FR-003)', () => {
    const { container } = renderHeader();
    const time = container.querySelector('time');

    expect(time).not.toBeNull();
    expect(time?.getAttribute('dateTime')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(time?.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it('renders the language toggle (FR-005)', () => {
    renderHeader();
    expect(
      screen.getByRole('button', { name: strings.en.languageToggleAria }),
    ).toBeInTheDocument();
  });
});
