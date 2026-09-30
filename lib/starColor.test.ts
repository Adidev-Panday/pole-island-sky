import { describe, expect, it } from 'vitest';
import { bvToRgb } from './starColor';

describe('bvToRgb', () => {
  it('returns neutral warm white for null bv', () => {
    expect(bvToRgb(null)).toEqual({ r: 255, g: 244, b: 234 });
  });

  it('clamps below bv=-0.4', () => {
    expect(bvToRgb(-0.4)).toEqual({ r: 155, g: 176, b: 255 });
    expect(bvToRgb(-1.0)).toEqual({ r: 155, g: 176, b: 255 });
  });

  it('clamps at/above bv=1.8', () => {
    expect(bvToRgb(1.8)).toEqual({ r: 255, g: 130, b: 80 });
    expect(bvToRgb(3.0)).toEqual({ r: 255, g: 130, b: 80 });
  });

  // Vega, bv ~ 0.0: per the spec's exact breakpoints this lands on
  // {170,191,255} - a pale blue-white (B notably above R), not a neutral
  // gray-white. That's the literal result of the given numbers; flagged in
  // the prompt-6 summary rather than fudged here to read "whiter".
  it('Vega (bv=0.0): pale, blue is the dominant channel', () => {
    const c = bvToRgb(0.0);
    expect(c).toEqual({ r: 170, g: 191, b: 255 });
    expect(c.b).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.r);
  });

  it('Rigel (bv=-0.03): very slightly bluer than Vega, almost identical', () => {
    const c = bvToRgb(-0.03);
    const vega = bvToRgb(0.0);
    expect(c.b).toBe(255);
    expect(c.r).toBeLessThanOrEqual(vega.r);
    expect(Math.abs(c.r - vega.r)).toBeLessThan(5);
  });

  it('Sun (bv=0.65): pale yellow (R and G high, B distinctly lower)', () => {
    const c = bvToRgb(0.65);
    expect(c).toEqual({ r: 255, g: 248, b: 221 });
    expect(c.r).toBeGreaterThan(240);
    expect(c.g).toBeGreaterThan(240);
    expect(c.b).toBeLessThan(c.g);
  });

  it('Arcturus (bv=1.23): warm orange (R > G > B, clear separation)', () => {
    const c = bvToRgb(1.23);
    expect(c).toEqual({ r: 255, g: 220, b: 172 });
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });

  it('Betelgeuse (bv=1.85): deep orange-red', () => {
    expect(bvToRgb(1.85)).toEqual({ r: 255, g: 130, b: 80 });
  });

  it('Antares (bv=1.83): deep orange-red, same as Betelgeuse (both >= 1.8)', () => {
    expect(bvToRgb(1.83)).toEqual({ r: 255, g: 130, b: 80 });
  });

  it('is continuous (no jumps) within each interpolated segment', () => {
    for (const bv of [-0.39, -0.2, 0.01, 0.2, 0.41, 0.6, 0.81, 1.0, 1.41, 1.6]) {
      const below = bvToRgb(bv - 0.001);
      const at = bvToRgb(bv);
      expect(Math.abs(at.r - below.r)).toBeLessThan(2);
      expect(Math.abs(at.g - below.g)).toBeLessThan(2);
      expect(Math.abs(at.b - below.b)).toBeLessThan(2);
    }
  });
});
