import { describe, expect, it } from 'vitest';
import {
  bayerGreekLetter,
  formatDistanceLightYears,
  formatLuminosity,
  spectralClassDescription,
  starDisplayName,
} from './starDisplay';
import type { CatalogStarRecord } from './sky';

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

describe('starDisplayName', () => {
  it('prefers the proper name', () => {
    expect(starDisplayName(star({ proper: 'Vega', bayer: 'Alp', hip: 91262 }))).toBe('Vega');
  });

  it('falls back to Bayer + constellation', () => {
    expect(starDisplayName(star({ bayer: 'Alp', con: 'Lyr', hip: 91262 }))).toBe('α Lyr');
  });

  it('falls back to HIP number', () => {
    expect(starDisplayName(star({ hip: 91262 }))).toBe('HIP 91262');
  });

  it('falls back to the internal catalog id as a last resort', () => {
    expect(starDisplayName(star({ id: 42 }))).toBe('Star 42');
  });
});

describe('bayerGreekLetter', () => {
  it('maps known abbreviations', () => {
    expect(bayerGreekLetter('Alp')).toBe('α');
    expect(bayerGreekLetter('Bet')).toBe('β');
  });

  it('falls back to the raw string for unknown abbreviations', () => {
    expect(bayerGreekLetter('Zzz')).toBe('Zzz');
  });
});

describe('formatDistanceLightYears', () => {
  it('reports catalog absence explicitly', () => {
    expect(formatDistanceLightYears(null)).toBe('Distance not in catalog.');
  });

  it('rounds to 1 decimal below 100 ly (Vega, 7.68pc)', () => {
    expect(formatDistanceLightYears(7.68)).toBe('25.0 light-years');
  });

  it('rounds to a whole number at/above 100 ly (Polaris, 132.63pc)', () => {
    expect(formatDistanceLightYears(132.63)).toBe('433 light-years');
  });
});

describe('formatLuminosity', () => {
  it('returns null when the catalog has no value', () => {
    expect(formatLuminosity(null)).toBeNull();
  });

  it('formats sub-10 values with 1 decimal', () => {
    expect(formatLuminosity(1.0)).toBe('1.0 times the Sun');
  });

  it('formats mid-range values as whole numbers with thousands separators', () => {
    expect(formatLuminosity(25)).toBe('25 times the Sun');
    expect(formatLuminosity(8700)).toBe('8,700 times the Sun');
  });

  it('formats million-scale values', () => {
    expect(formatLuminosity(1_200_000)).toBe('1.2 million times the Sun');
  });
});

describe('spectralClassDescription', () => {
  it('returns null for a null spect', () => {
    expect(spectralClassDescription(null)).toBeNull();
  });

  it('Vega, A0Vvar -> hot blue-white main sequence', () => {
    expect(spectralClassDescription('A0Vvar')).toBe('hot blue-white main sequence');
  });

  it('Betelgeuse, M2Ib -> red supergiant', () => {
    expect(spectralClassDescription('M2Ib')).toBe('red supergiant');
  });

  it('Polaris, F7:Ib-IIv SB -> yellow-white supergiant (leftmost class wins over a later "-II")', () => {
    expect(spectralClassDescription('F7:Ib-IIv SB')).toBe('yellow-white supergiant');
  });

  it('picks up giant/subgiant/bright-giant classes', () => {
    expect(spectralClassDescription('K1III')).toBe('orange giant');
    expect(spectralClassDescription('G8IV')).toBe('yellow subgiant');
    expect(spectralClassDescription('B2II')).toBe('blue-white bright giant');
  });

  it('falls back to just the color phrase when no luminosity class is found', () => {
    expect(spectralClassDescription('M')).toBe('red');
  });

  it('falls back to just the luminosity phrase for an unrecognized class letter', () => {
    expect(spectralClassDescription('C5V')).toBe('main sequence');
  });

  it('returns null when neither half is recognized', () => {
    expect(spectralClassDescription('DA2')).toBeNull();
  });
});
