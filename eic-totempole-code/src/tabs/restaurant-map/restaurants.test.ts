import { describe, expect, it } from 'vitest';

import { LOCALES } from '../../i18n/locales';
import { MAX_RESTAURANTS, RESTAURANTS } from './restaurants.static';

/**
 * Data invariants V1–V7 from specs/003-restaurant-map/data-model.md §1.
 *
 * These are the FR-023 guarantees a test CAN prove. What no test can prove is
 * that these entries match the pins on the Google My Maps map — the embed is
 * keyless and opaque, so the app cannot read the pins and CI cannot either.
 * That parity is an editorial procedure (contracts/curated-data.md §3), and
 * pretending otherwise here would be a false green on the feature's main data
 * risk.
 */
describe('curated restaurant set', () => {
  it('holds between 1 and the 8-restaurant cap (V1, FR-031, FR-005)', () => {
    expect(RESTAURANTS.length).toBeGreaterThanOrEqual(1);
    expect(RESTAURANTS.length).toBeLessThanOrEqual(MAX_RESTAURANTS);
  });

  it('numbers exactly 1..n with no gaps or duplicates (V2, FR-006)', () => {
    const numbers = RESTAURANTS.map((r) => r.number).sort((a, b) => a - b);
    const expected = Array.from({ length: RESTAURANTS.length }, (_, i) => i + 1);
    // A gap or duplicate here means a list number has no matching map pin,
    // which is the exact drift FR-023 exists to prevent.
    expect(numbers).toEqual(expected);
  });

  it('has unique, non-empty names (V3, FR-005)', () => {
    const names = RESTAURANTS.map((r) => r.name);
    for (const name of names) {
      expect(name.trim()).not.toBe('');
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('has a non-empty address in every locale (V4, FR-013)', () => {
    for (const restaurant of RESTAURANTS) {
      for (const locale of LOCALES) {
        expect(
          restaurant.address[locale].trim(),
          `${restaurant.name} is missing its ${locale} address`,
        ).not.toBe('');
      }
    }
  });

  it('has both locales filled in wherever cuisine is present (V5, FR-018)', () => {
    for (const restaurant of RESTAURANTS) {
      if (!restaurant.cuisine) continue;
      for (const locale of LOCALES) {
        expect(
          restaurant.cuisine[locale].trim(),
          `${restaurant.name} is missing its ${locale} cuisine`,
        ).not.toBe('');
      }
    }
  });

  it('has a positive integer walking time on every entry (V6, FR-006, FR-038)', () => {
    for (const restaurant of RESTAURANTS) {
      // Required, not optional: every companion-list row shows it (FR-038).
      expect(Number.isInteger(restaurant.walkMinutes)).toBe(true);
      expect(restaurant.walkMinutes).toBeGreaterThan(0);
    }
  });

  it('is frozen so nothing can grow it past the cap at runtime (V7)', () => {
    // `as const` is compile-time only and does nothing once compiled, so the
    // FR-031 layout guarantee needs a real runtime freeze to survive.
    expect(Object.isFrozen(RESTAURANTS)).toBe(true);
  });
});
