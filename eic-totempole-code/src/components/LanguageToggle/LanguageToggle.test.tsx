import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { strings } from '../../i18n/strings';
import { LanguageToggle } from './LanguageToggle';

function renderToggle() {
  return render(
    <KioskProvider>
      <LanguageToggle />
    </KioskProvider>,
  );
}

describe('LanguageToggle', () => {
  it('announces the language it switches TO', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button', { name: strings.en.languageToggleAria });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(
      screen.getByRole('button', { name: strings.hu.languageToggleAria }),
    ).toBeInTheDocument();
  });

  it('exposes the non-default locale via aria-pressed', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles back to the original locale', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));

    expect(
      screen.getByRole('button', { name: strings.en.languageToggleAria }),
    ).toBeInTheDocument();
  });
});
