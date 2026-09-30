export interface RGB {
  r: number;
  g: number;
  b: number;
}

const NEUTRAL_WARM_WHITE: RGB = { r: 255, g: 244, b: 234 };

/**
 * B-V color breakpoints, each anchored at the altitude given in the prompt's
 * range notation (e.g. "-0.4 <= bv < 0: interp to r=170,g=191,b=255" anchors
 * that color at bv=0, the upper edge of its range) with linear interpolation
 * between adjacent anchors. bv < -0.4 and bv >= 1.8 are flat clamps, per the
 * spec - note this means there's a deliberate small jump right at bv=1.8
 * (segment 1.4-1.8 interpolates toward {255,180,130}, but the >=1.8 clamp is
 * a different, redder {255,130,80}), not a rounding error.
 */
const BREAKPOINTS: Array<{ bv: number; color: RGB }> = [
  { bv: -0.4, color: { r: 155, g: 176, b: 255 } },
  { bv: 0.0, color: { r: 170, g: 191, b: 255 } },
  { bv: 0.4, color: { r: 255, g: 255, b: 255 } },
  { bv: 0.8, color: { r: 255, g: 244, b: 200 } },
  { bv: 1.4, color: { r: 255, g: 210, b: 161 } },
  { bv: 1.8, color: { r: 255, g: 180, b: 130 } },
];

const HOT_CLAMP: RGB = BREAKPOINTS[0].color; // bv < -0.4
const COOL_CLAMP: RGB = { r: 255, g: 130, b: 80 }; // bv >= 1.8

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

/** Approximates a star's visual color from its B-V color index. */
export function bvToRgb(bv: number | null): RGB {
  if (bv === null) return NEUTRAL_WARM_WHITE;
  if (bv < BREAKPOINTS[0].bv) return HOT_CLAMP;
  if (bv >= 1.8) return COOL_CLAMP;

  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const a = BREAKPOINTS[i];
    const b = BREAKPOINTS[i + 1];
    if (bv >= a.bv && bv < b.bv) {
      const t = (bv - a.bv) / (b.bv - a.bv);
      return lerpColor(a.color, b.color, t);
    }
  }
  return COOL_CLAMP; // unreachable given the clamps above
}

export function rgbToCss(color: RGB, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}
