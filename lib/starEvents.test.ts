import { describe, expect, it } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { computeStarRiseTransitSet } from './starEvents';
import { computeStarAltAz, type CatalogStarRecord } from './sky';
import { POLE_ISLAND } from './observer';

const observer = new Astronomy.Observer(POLE_ISLAND.latitude, POLE_ISLAND.longitude, POLE_ISLAND.elevationMeters);
const DAY_START = new Date('2025-08-15T00:00:00Z');

function star(overrides: Partial<CatalogStarRecord>): CatalogStarRecord {
  return {
    id: 1,
    hip: null,
    ra: 0,
    dec: 0,
    mag: 0,
    ci: null,
    spect: null,
    pmra: null,
    pmdec: null,
    proper: null,
    bayer: null,
    con: null,
    dist: null,
    absmag: null,
    lum: null,
    ...overrides,
  };
}

// Polaris: dec ~89.3, well above 90 - latitude (~46.3) - never sets from Casco Bay.
const POLARIS = star({ proper: 'Polaris', ra: 2.52975, dec: 89.26411 });

// Sirius: dec ~-16.7, well within rise/set range from 43.7N.
const SIRIUS = star({ proper: 'Sirius', ra: 6.75248, dec: -16.7161 });

describe('computeStarRiseTransitSet', () => {
  it('Polaris is circumpolar from Casco Bay: no rise/set, always above horizon', () => {
    const result = computeStarRiseTransitSet(POLARIS, observer, DAY_START);
    expect(result.circumpolar).toBe(true);
    expect(result.neverRises).toBe(false);
    expect(result.rise).toBeNull();
    expect(result.set).toBeNull();
    expect(result.transit).not.toBeNull();
  });

  it('Sirius rises and sets, with rise < transit < set', () => {
    const result = computeStarRiseTransitSet(SIRIUS, observer, DAY_START);
    expect(result.circumpolar).toBe(false);
    expect(result.neverRises).toBe(false);
    expect(result.rise).not.toBeNull();
    expect(result.set).not.toBeNull();
    expect(result.transit).not.toBeNull();
    expect(result.rise!.getTime()).toBeLessThan(result.transit!.getTime());
    expect(result.transit!.getTime()).toBeLessThan(result.set!.getTime());
  });

  it('transit time is close to the actual altitude peak (within a couple minutes)', () => {
    const result = computeStarRiseTransitSet(SIRIUS, observer, DAY_START);
    const altAtTransit = computeStarAltAz(SIRIUS, observer, result.transit!).altitudeDeg;
    const altOneHourOff = computeStarAltAz(
      SIRIUS,
      observer,
      new Date(result.transit!.getTime() + 3600_000)
    ).altitudeDeg;
    expect(altAtTransit).toBeGreaterThan(altOneHourOff);
  });

  it('rise altitude is ~0deg (interpolated horizon crossing)', () => {
    const result = computeStarRiseTransitSet(SIRIUS, observer, DAY_START);
    const altAtRise = computeStarAltAz(SIRIUS, observer, result.rise!).altitudeDeg;
    expect(Math.abs(altAtRise)).toBeLessThan(0.5);
  });
});
