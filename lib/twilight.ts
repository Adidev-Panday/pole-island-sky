import type { RGB } from '@/lib/starColor';

export const TWILIGHT_WINDOW_TOP_ALT_DEG = 5;
export const TWILIGHT_WINDOW_BOTTOM_ALT_DEG = -18;

function hex(hexColor: string): RGB {
  const n = parseInt(hexColor.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

interface Anchor {
  altDeg: number;
  inner: RGB;
  innerAlpha: number;
  outer: RGB;
}

/**
 * Anchors for the sun-centered twilight gradient, altitude descending.
 *
 * The prompt gives each named phase (civil/nautical/astronomical) one flat
 * color+alpha for its whole altitude range, but also asks for smooth (not
 * stepped) interpolation across boundaries. Reconciling those: each phase's
 * given value is anchored at the midpoint of its range, and colors/alphas
 * are linearly interpolated between consecutive anchors. The two window
 * edges (+5deg and -18deg) are added as alpha=0 anchors so the whole effect
 * fades in/out smoothly rather than popping at the activation boundary.
 */
const ANCHORS: Anchor[] = [
  { altDeg: TWILIGHT_WINDOW_TOP_ALT_DEG, inner: hex('#ffb066'), innerAlpha: 0, outer: hex('#0a1834') },
  { altDeg: 2.5, inner: hex('#ffb066'), innerAlpha: 1.0, outer: hex('#0a1834') }, // midpoint of (0, +5]
  { altDeg: -3, inner: hex('#ff7a3d'), innerAlpha: 0.85, outer: hex('#040815') }, // midpoint of (-6, 0]
  { altDeg: -9, inner: hex('#3a4a80'), innerAlpha: 0.55, outer: hex('#020408') }, // midpoint of (-12, -6]
  { altDeg: -15, inner: hex('#0e1a3a'), innerAlpha: 0.25, outer: hex('#010204') }, // midpoint of (-18, -12]
  { altDeg: TWILIGHT_WINDOW_BOTTOM_ALT_DEG, inner: hex('#0e1a3a'), innerAlpha: 0, outer: hex('#010204') },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

export interface TwilightGradientStops {
  innerColor: RGB;
  innerAlpha: number;
  outerColor: RGB;
}

/** Null outside the (-18, +5] activation window - pure night, no gradient. */
export function twilightGradientForAltitude(sunAltDeg: number): TwilightGradientStops | null {
  if (sunAltDeg > TWILIGHT_WINDOW_TOP_ALT_DEG || sunAltDeg <= TWILIGHT_WINDOW_BOTTOM_ALT_DEG) {
    return null;
  }

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i]; // higher altitude
    const b = ANCHORS[i + 1]; // lower altitude
    if (sunAltDeg <= a.altDeg && sunAltDeg >= b.altDeg) {
      const t = (a.altDeg - sunAltDeg) / (a.altDeg - b.altDeg);
      return {
        innerColor: lerpRgb(a.inner, b.inner, t),
        innerAlpha: lerp(a.innerAlpha, b.innerAlpha, t),
        outerColor: lerpRgb(a.outer, b.outer, t),
      };
    }
  }
  return null; // unreachable given the window check above
}

const HORIZON_GLOW_COLOR: RGB = { r: 20, g: 30, b: 60 };
const HORIZON_GLOW_PEAK_ALPHA = 0.15;
const HORIZON_GLOW_TOP_ALT_DEG = -12;
const HORIZON_GLOW_PEAK_ALT_DEG = -15;
const HORIZON_GLOW_BOTTOM_ALT_DEG = -18;

/**
 * Extra horizon-hugging glow for the astronomical-twilight range, independent
 * of the sun's azimuth. Envelope peaks at the range's midpoint and fades to 0
 * at both edges, for the same "not stepped" reason as the main gradient.
 */
export function horizonGlowAlpha(sunAltDeg: number): number {
  if (sunAltDeg > HORIZON_GLOW_TOP_ALT_DEG || sunAltDeg <= HORIZON_GLOW_BOTTOM_ALT_DEG) return 0;
  const envelope =
    sunAltDeg > HORIZON_GLOW_PEAK_ALT_DEG
      ? (sunAltDeg - HORIZON_GLOW_TOP_ALT_DEG) / (HORIZON_GLOW_PEAK_ALT_DEG - HORIZON_GLOW_TOP_ALT_DEG)
      : (sunAltDeg - HORIZON_GLOW_BOTTOM_ALT_DEG) / (HORIZON_GLOW_PEAK_ALT_DEG - HORIZON_GLOW_BOTTOM_ALT_DEG);
  return envelope * HORIZON_GLOW_PEAK_ALPHA;
}

export function horizonGlowColor(): RGB {
  return HORIZON_GLOW_COLOR;
}
