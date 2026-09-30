import { describe, expect, it } from 'vitest';
import { getSkyRadius, projectAltAz, projectAltAzUnclamped, zoomAroundPoint } from './projection';

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

describe('projectAltAz with zoom/pan', () => {
  it('zoom=1, pan=0 matches the unzoomed projection', () => {
    const zoomed = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS, 0, 1, { x: 0, y: 0 });
    const plain = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS);
    expect(zoomed).toEqual(plain);
  });

  it('scales distance from canvas origin by zoom, then offsets by pan', () => {
    const plain = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS)!;
    const zoomed = projectAltAz({ altitudeDeg: 45, azimuthDeg: 30 }, CANVAS, 0, 3, { x: 10, y: -20 })!;
    expect(zoomed.x).toBeCloseTo(plain.x * 3 + 10, 9);
    expect(zoomed.y).toBeCloseTo(plain.y * 3 - 20, 9);
  });

  it('zoom scales the zenith-to-horizon distance (star size / spacing grows with zoom)', () => {
    const p1 = projectAltAz({ altitudeDeg: 45, azimuthDeg: 0 }, CANVAS, 0, 1)!;
    const p5 = projectAltAz({ altitudeDeg: 45, azimuthDeg: 0 }, CANVAS, 0, 5)!;
    const d1 = Math.hypot(p1.x - centerX, p1.y - centerY);
    const d5 = Math.hypot(p5.x - centerX * 5, p5.y - centerY * 5);
    expect(d5).toBeCloseTo(d1 * 5, 6);
  });
});

describe('zoomAroundPoint', () => {
  it('keeps a star already under the anchor pixel fixed on screen across a zoom change', () => {
    const anchor = projectAltAz({ altitudeDeg: 60, azimuthDeg: 10 }, CANVAS, 0, 1, { x: 0, y: 0 })!;
    const { zoom, pan } = zoomAroundPoint(1, { x: 0, y: 0 }, anchor, 4);
    expect(zoom).toBe(4);
    const after = projectAltAz({ altitudeDeg: 60, azimuthDeg: 10 }, CANVAS, 0, zoom, pan)!;
    expect(after.x).toBeCloseTo(anchor.x, 9);
    expect(after.y).toBeCloseTo(anchor.y, 9);
  });

  it('keeps the anchor fixed across a second zoom step from a non-trivial start', () => {
    // Check the fixed-point equation directly: anchor == raw*zoom + pan,
    // where raw is the anchor's zoom=1 coordinate (pan={0,0} at zoom=1).
    const anchor = { x: 550, y: 240 };
    const step1 = zoomAroundPoint(1, { x: 0, y: 0 }, anchor, 3);
    const step2 = zoomAroundPoint(step1.zoom, step1.pan, anchor, 9);
    const screen = { x: anchor.x * step2.zoom + step2.pan.x, y: anchor.y * step2.zoom + step2.pan.y };
    expect(screen.x).toBeCloseTo(anchor.x, 6);
    expect(screen.y).toBeCloseTo(anchor.y, 6);
  });

  it('clamps to [min, max]', () => {
    expect(zoomAroundPoint(1, { x: 0, y: 0 }, { x: 0, y: 0 }, 50).zoom).toBe(20);
    expect(zoomAroundPoint(5, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.1).zoom).toBe(1);
  });

  it('forces pan back to {0,0} when zooming down to 1x', () => {
    const { zoom, pan } = zoomAroundPoint(4, { x: 120, y: -80 }, { x: 300, y: 200 }, 1);
    expect(zoom).toBe(1);
    expect(pan).toEqual({ x: 0, y: 0 });
  });

  it('is idempotent chaining zoom-in then zoom-out around the same anchor', () => {
    const anchor = { x: 500, y: 400 };
    const step1 = zoomAroundPoint(1, { x: 0, y: 0 }, anchor, 8);
    const step2 = zoomAroundPoint(step1.zoom, step1.pan, anchor, 1);
    expect(step2.zoom).toBe(1);
    expect(step2.pan).toEqual({ x: 0, y: 0 });
  });
});
