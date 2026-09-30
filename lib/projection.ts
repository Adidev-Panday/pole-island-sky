export interface AltAzInput {
  altitudeDeg: number;
  azimuthDeg: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Inset from the canvas edge so the horizon circle isn't clipped by the
 * viewport, and so cardinal labels drawn just outside the circle (see
 * CARDINAL_LABEL_OFFSET_PX in SkyCanvas) still fit on-canvas.
 */
export const CANVAS_MARGIN_PX = 28;

/** Radius (px) of the horizon circle for a given canvas size. */
export function getSkyRadius({ width, height }: CanvasSize): number {
  return Math.min(width, height) / 2 - CANVAS_MARGIN_PX;
}

const DEG2RAD = Math.PI / 180;
const TAN_45_DEG = Math.tan(45 * DEG2RAD); // == 1, kept explicit to match the projection's derivation

/**
 * Zenith-centered stereographic projection onto canvas pixels.
 *
 * North (azimuth 0) is at the top, east (azimuth 90) at the right — the view
 * looking straight up while lying on your back facing north. `rotationDeg`
 * (default 0) simulates turning your head while lying flat: it's subtracted
 * from azimuth before projecting, so increasing rotationDeg spins the whole
 * sky clockwise around zenith (dragging the compass dial clockwise by
 * rotationDeg turns the rendered sky the same way the real sky would appear
 * to turn if you rotated your head by that amount). Applied here (per-point,
 * before x/y) rather than as a canvas transform, so text drawn at the
 * returned point (star/constellation labels) is never itself rotated.
 *
 * r = R * tan(z/2) / tan(45deg), where z = 90 - altitude is the zenith angle
 * and R is the horizon radius. This normalizes the standard stereographic
 * radius (2*f*tan(z/2)) so that z=90 (the horizon) lands exactly on R,
 * rather than 2R — the horizon must clip at the canvas edge.
 *
 * Returns null for anything below the horizon (altitude < 0).
 */
function projectRaw(
  altitudeDeg: number,
  azimuthDeg: number,
  canvasSize: CanvasSize,
  rotationDeg: number
): ProjectedPoint {
  const radius = getSkyRadius(canvasSize);

  const zenithAngleRad = ((90 - altitudeDeg) / 2) * DEG2RAD;
  const r = (radius * Math.tan(zenithAngleRad)) / TAN_45_DEG;

  const azRad = (azimuthDeg - rotationDeg) * DEG2RAD;
  const x = canvasSize.width / 2 + r * Math.sin(azRad);
  const y = canvasSize.height / 2 - r * Math.cos(azRad);

  return { x, y };
}

export function projectAltAz(
  { altitudeDeg, azimuthDeg }: AltAzInput,
  canvasSize: CanvasSize,
  rotationDeg = 0
): ProjectedPoint | null {
  if (altitudeDeg < 0) return null;
  return projectRaw(Math.min(90, altitudeDeg), azimuthDeg, canvasSize, rotationDeg);
}

/**
 * Same projection as projectAltAz, but never returns null and never clips
 * negative altitude to the horizon - a below-horizon point lands outside the
 * horizon circle, at a radius that grows as altitude drops further below 0.
 * For effects that need a geometrically correct off-screen anchor (e.g. the
 * twilight gradient's center when the sun is below the horizon), not for
 * anything actually drawn as a visible sky object.
 */
export function projectAltAzUnclamped(
  { altitudeDeg, azimuthDeg }: AltAzInput,
  canvasSize: CanvasSize,
  rotationDeg = 0
): ProjectedPoint {
  return projectRaw(altitudeDeg, azimuthDeg, canvasSize, rotationDeg);
}
