import { describe, expect, it } from 'vitest';
import { airmass, effectiveMagnitude, horizonFadeFactor } from './extinction';

describe('airmass', () => {
  it('is ~1 at zenith', () => {
    expect(airmass(90)).toBeCloseTo(1, 3);
  });

  it('increases monotonically as altitude decreases', () => {
    const altitudes = [90, 60, 30, 15, 5, 1];
    for (let i = 1; i < altitudes.length; i++) {
      expect(airmass(altitudes[i])).toBeGreaterThan(airmass(altitudes[i - 1]));
    }
  });
});

describe('effectiveMagnitude', () => {
  it('leaves zenith magnitude unchanged', () => {
    expect(effectiveMagnitude(2.5, 90)).toBeCloseTo(2.5, 2);
  });

  it('dims a mag-1 star to near invisibility below ~2deg altitude', () => {
    expect(effectiveMagnitude(1, 2)).toBeGreaterThan(6);
  });

  it('dims progressively as altitude drops toward the horizon', () => {
    const altitudes = [90, 45, 20, 10, 5, 2, 0.5];
    for (let i = 1; i < altitudes.length; i++) {
      expect(effectiveMagnitude(1, altitudes[i])).toBeGreaterThan(
        effectiveMagnitude(1, altitudes[i - 1])
      );
    }
  });
});

describe('horizonFadeFactor', () => {
  it('is 0 at and below 5deg', () => {
    expect(horizonFadeFactor(5)).toBe(0);
    expect(horizonFadeFactor(0)).toBe(0);
  });

  it('is 1 at and above 15deg', () => {
    expect(horizonFadeFactor(15)).toBe(1);
    expect(horizonFadeFactor(30)).toBe(1);
  });

  it('is linear in between, 0.5 at the midpoint', () => {
    expect(horizonFadeFactor(10)).toBeCloseTo(0.5, 6);
  });
});
