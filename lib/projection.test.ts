import { describe, expect, it } from 'vitest';
import { getSkyRadius, projectAltAz } from './projection';

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
});
