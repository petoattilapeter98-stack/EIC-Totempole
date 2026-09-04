import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KioskProvider } from '../context/KioskContext';
import { LOCALES } from '../i18n/locales';
import { DEFAULT_TAB_ID, TABS } from './registry';

/**
 * Test contract from specs/001-lobby-kiosk-shell/contracts/tab-module.md.
 * These assertions are what keep the extension seam honest as tabs are added.
 */
describe('tab registry', () => {
  it('registers exactly four tabs in the FR-011 order', () => {
    expect(TABS.map((t) => t.meta.id)).toEqual([
      'board-agenda',
      'local-transit',
      'company-highlights',
      'guest-wifi',
    ]);
  });

  it('has a unique id per tab', () => {
    const ids = TABS.map((t) => t.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('supplies a non-empty label in every locale', () => {
    for (const { meta } of TABS) {
      for (const locale of LOCALES) {
        expect(meta.label[locale]?.trim()).toBeTruthy();
      }
    }
  });

  it('includes the default tab', () => {
    expect(TABS.some((t) => t.meta.id === DEFAULT_TAB_ID)).toBe(true);
  });

  it.each(TABS.map((t) => [t.meta.id, t] as const))(
    'renders %s without throwing',
    (_id, tab) => {
      const { Component, meta } = tab;
      render(
        <KioskProvider>
          <Component />
        </KioskProvider>,
      );

      // The placeholder is distinct per tab: it names the tab itself (FR-014).
      expect(screen.getByRole('heading', { name: meta.label.en })).toBeInTheDocument();
    },
  );
});
