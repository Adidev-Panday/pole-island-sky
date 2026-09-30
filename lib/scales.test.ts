import { describe, expect, it } from 'vitest';
import {
  SCALE_STOPS,
  SCALE_GROUP_SIZE,
  backgroundColorForStop,
  placeholderImageUrl,
  stopIndexFromId,
} from './scales';

describe('SCALE_STOPS', () => {
  it('has exactly 18 stops', () => {
    expect(SCALE_STOPS).toHaveLength(18);
  });

  it('has unique ids', () => {
    const ids = new Set(SCALE_STOPS.map((s) => s.id));
    expect(ids.size).toBe(SCALE_STOPS.length);
  });

  it('fixes the acceptance checkpoints: Planck length (0), Proton (1), human hair (6), Milky Way (15)', () => {
    expect(SCALE_STOPS[0].name).toBe('Planck length');
    expect(SCALE_STOPS[1].name).toBe('Proton');
    expect(SCALE_STOPS[6].name).toBe('Human hair');
    expect(SCALE_STOPS[15].id).toBe('milky-way');
  });

  it('groups cleanly into three sixes (Quantum/Human/Cosmic)', () => {
    expect(SCALE_STOPS.length % SCALE_GROUP_SIZE).toBe(0);
    expect(SCALE_STOPS.length / SCALE_GROUP_SIZE).toBe(3);
  });
});

describe('stopIndexFromId', () => {
  it('resolves a known id', () => {
    expect(stopIndexFromId('milky-way')).toBe(15);
  });

  it('falls back to 0 for missing/unknown ids', () => {
    expect(stopIndexFromId(null)).toBe(0);
    expect(stopIndexFromId(undefined)).toBe(0);
    expect(stopIndexFromId('not-a-real-stop')).toBe(0);
  });
});

describe('placeholderImageUrl', () => {
  it('encodes name and scale into the placeholder route', () => {
    const url = placeholderImageUrl(SCALE_STOPS[0]);
    expect(url).toContain('/scales/placeholder?');
    expect(url).toContain('name=Planck%20length');
    expect(url).toContain('scale=');
  });
});

describe('backgroundColorForStop', () => {
  it('starts near-black and ends lighter/warmer', () => {
    const start = backgroundColorForStop(0);
    const end = backgroundColorForStop(SCALE_STOPS.length - 1);
    const startLightness = Number(start.match(/,\s*([\d.]+)%\)/)![1]);
    const endLightness = Number(end.match(/,\s*([\d.]+)%\)/)![1]);
    expect(startLightness).toBeLessThan(endLightness);
  });

  it('lightness increases monotonically across the journey', () => {
    const lightnesses = SCALE_STOPS.map((_, i) => {
      const color = backgroundColorForStop(i);
      return Number(color.match(/,\s*([\d.]+)%\)/)![1]);
    });
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeGreaterThanOrEqual(lightnesses[i - 1]);
    }
  });
});
