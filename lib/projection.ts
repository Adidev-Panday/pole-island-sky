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

export interface PanOffset {
  x: number;
  y: number;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 20;

const IDENTITY_PAN: PanOffset = { x: 0, y: 0 };

/**
 * Inset from the canvas edge so the horizon circle isn't clipped by the
 * viewport, and so cardinal labels drawn just outside the circle (see
 * CARDINAL_LABEL_OFFSET_PX in SkyCanvas) still fit on-canvas.
 */
export const CANVAS_MARGIN_PX = 28;

/**
 * Radius (px) of the horizon circle for a given canvas size.
 *
 * Uses the longer dimension so the horizon circle fills the viewport rather
 * than being inscribed in it: the circle clips at top/bottom in portrait and
 * left/right in landscape, and corners show sky above the horizon instead of
 * empty space beyond it.
 */
export function getSkyRadius({ width, height }: CanvasSize): number {
  return Math.max(width, height) / 2 - CANVAS_MARGIN_PX;
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
 * `zoom`/`pan` are applied last, uniformly, to the finished (rotationDeg
 * already baked in) pixel coordinates: `screen = raw * zoom + pan`. This
 * keeps the angular math independent of the view transform - everything
 * drawn through this function (or the matching manual transform for the
 * horizon ring, which isn't alt/az-driven) scales and translates together,
 * so the whole rendered scene zooms as one consistent picture rather than
 * stars drifting relative to the horizon.
 *
 * Returns null for anything below the horizon (altitude < 0).
 */
function projectRaw(
  altitudeDeg: number,
  azimuthDeg: number,
  canvasSize: CanvasSize,
  rotationDeg: number,
  zoom: number,
  pan: PanOffset
): ProjectedPoint {
  const radius = getSkyRadius(canvasSize);

  const zenithAngleRad = ((90 - altitudeDeg) / 2) * DEG2RAD;
  const r = (radius * Math.tan(zenithAngleRad)) / TAN_45_DEG;

  const azRad = (azimuthDeg - rotationDeg) * DEG2RAD;
  const x = canvasSize.width / 2 + r * Math.sin(azRad);
  const y = canvasSize.height / 2 - r * Math.cos(azRad);

  return { x: x * zoom + pan.x, y: y * zoom + pan.y };
}

export function projectAltAz(
  { altitudeDeg, azimuthDeg }: AltAzInput,
  canvasSize: CanvasSize,
  rotationDeg = 0,
  zoom = 1,
  pan: PanOffset = IDENTITY_PAN
): ProjectedPoint | null {
  if (altitudeDeg < 0) return null;
  return projectRaw(Math.min(90, altitudeDeg), azimuthDeg, canvasSize, rotationDeg, zoom, pan);
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
  rotationDeg = 0,
  zoom = 1,
  pan: PanOffset = IDENTITY_PAN
): ProjectedPoint {
  return projectRaw(altitudeDeg, azimuthDeg, canvasSize, rotationDeg, zoom, pan);
}

/**
 * Computes the {zoom, pan} that results from zooming to `targetZoom` (clamped
 * to [min, max]) while keeping `anchor` (a canvas-pixel point, e.g. the
 * cursor or pinch center) visually fixed on screen.
 *
 * Derivation: a point's screen position is `raw*zoom + pan`. The raw
 * (pre-zoom) coordinate under the anchor is therefore
 * `(anchor - currentPan) / currentZoom`, which is invariant under the zoom
 * change; solving `anchor = rawAnchor*newZoom + newPan` for newPan keeps
 * that same raw point under the same screen pixel at the new zoom level.
 *
 * At zoom <= 1 (the "whole hemisphere" default view), pan is forced back to
 * {0, 0} - panning is disabled at 1x, so there's nothing for a lingering pan
 * offset to do except leave the horizon circle off-center.
 */
export function zoomAroundPoint(
  currentZoom: number,
  currentPan: PanOffset,
  anchor: ProjectedPoint,
  targetZoom: number,
  min = ZOOM_MIN,
  max = ZOOM_MAX
): { zoom: number; pan: PanOffset } {
  const newZoom = Math.min(max, Math.max(min, targetZoom));
  if (newZoom <= ZOOM_MIN) {
    return { zoom: newZoom, pan: { x: 0, y: 0 } };
  }

  const rawAnchorX = (anchor.x - currentPan.x) / currentZoom;
  const rawAnchorY = (anchor.y - currentPan.y) / currentZoom;

  return {
    zoom: newZoom,
    pan: {
      x: anchor.x - rawAnchorX * newZoom,
      y: anchor.y - rawAnchorY * newZoom,
    },
  };
}
