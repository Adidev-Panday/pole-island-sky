import { describe, expect, it } from 'vitest';
import { getSkyRadius, projectAltAz, projectAltAzUnclamped } from './projection';

const CANVAS = { width: 800, height: 600 };
const R = getSkyRadius(CANVAS);
const centerX = CANVAS.width / 2;
const centerY = CANVAS.height / 2;

function distanceFromCenter(point: { x: number; y: number }): number {
  return Math.hypot(point.x - centerX, point.y - centerY);
}

describe('projectAltAz', () => {
  it('maps the zenith (alt=90) to the canvas center', () => {
    const point = projectAltAz({ altitudeDeg: 90, azimuthDeg: 37 }, CANVAS);
    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(centerX, 9);
    expect(point!.y).toBeCloseTo(centerY, 9);
  });

  it('maps the horizon (alt=0) to the canvas edge', () => {
    const point = projectAltAz({ altitudeDeg: 0, azimuthDeg: 123 }, CANVAS);
    expect(point).not.toBeNull();
    expect(distanceFromCenter(point!)).toBeCloseTo(R, 9);
  });

  it('maps altitude 45 to R * tan(22.5deg) / tan(45deg) from center', () => {
    const expected =
      (R * Math.tan((22.5 * Math.PI) / 180)) / Math.tan(Math.PI / 4);
    const point = projectAltAz({ altitudeDeg: 45, azimuthDeg: 0 }, CANVAS);
    expect(point).not.toBeNull();
    expect(distanceFromCenter(point!)).toBeCloseTo(expected, 9);
  });

  it('places north (az=0) above center and east (az=90) to the right', () => {
    const north = projectAltAz({ altitudeDeg: 45, azimuthDeg: 0 }, CANVAS)!;
    const east = projectAltAz({ altitudeDeg: 45, azimuthDeg: 90 }, CANVAS)!;
    expect(north.x).toBeCloseTo(centerX, 9);
    expect(north.y).toBeLessThan(centerY);
    expect(east.y).toBeCloseTo(centerY, 9);
    expect(east.x).toBeGreaterThan(centerX);
  });

  it('returns null below the horizon', () => {
    expect(projectAltAz({ altitudeDeg: -0.01, azimuthDeg: 0 }, CANVAS)).toBeNull();
    expect(projectAltAz({ altitudeDeg: -45, azimuthDeg: 0 }, CANVAS)).toBeNull();
  });

  it('defaults rotationDeg to 0 (unrotated)', () => {
    const a = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS);
    const b = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS, 0);
    expect(a).toEqual(b);
  });

  it('rotating by rotationDeg is equivalent to subtracting it from azimuth', () => {
    const rotated = projectAltAz({ altitudeDeg: 45, azimuthDeg: 90 }, CANVAS, 90);
    const unrotatedEquivalent = projectAltAz({ altitudeDeg: 45, azimuthDeg: 0 }, CANVAS);
    expect(rotated!.x).toBeCloseTo(unrotatedEquivalent!.x, 9);
    expect(rotated!.y).toBeCloseTo(unrotatedEquivalent!.y, 9);
  });

  it('does not change the distance from center (rotation preserves altitude)', () => {
    const point = projectAltAz({ altitudeDeg: 30, azimuthDeg: 15 }, CANVAS, 123);
    const expected = projectAltAz({ altitudeDeg: 30, azimuthDeg: 15 }, CANVAS, 0);
    expect(distanceFromCenter(point!)).toBeCloseTo(distanceFromCenter(expected!), 9);
  });
});

describe('projectAltAzUnclamped', () => {
  it('matches projectAltAz above the horizon', () => {
    const a = projectAltAz({ altitudeDeg: 30, azimuthDeg: 200 }, CANVAS, 10);
    const b = projectAltAzUnclamped({ altitudeDeg: 30, azimuthDeg: 200 }, CANVAS, 10);
    expect(b).toEqual(a);
  });

  it('never returns null, and projects below-horizon points further out than the horizon circle', () => {
    const point = projectAltAzUnclamped({ altitudeDeg: -18, azimuthDeg: 0 }, CANVAS);
    expect(point).not.toBeNull();
    expect(distanceFromCenter(point)).toBeGreaterThan(R);
  });

  it('keeps the below-horizon point in the correct compass direction', () => {
    const point = projectAltAzUnclamped({ altitudeDeg: -10, azimuthDeg: 90 }, CANVAS);
    // az=90 (east) should still be to the right, at the vertical center.
    expect(point.x).toBeGreaterThan(centerX);
    expect(point.y).toBeCloseTo(centerY, 6);
  });
});
