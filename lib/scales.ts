export interface ScaleStop {
  /** URL-safe slug, used as the ?stop=<id> query value. */
  id: string;
  /**
   * Power of ten, in meters, e.g. -35 for the Planck length. A number, not a
   * pre-rendered "10⁻³⁵ m" string: the precomposed Unicode superscript
   * characters needed for exponents outside ⁰-³ (U+2070-2079, U+207B) have
   * spotty font coverage and render as tofu in both the browser and the
   * Satori-based OG/placeholder image renderer - see scaleLabelPlainText and
   * the real <sup> markup in ScalesExperience for the two safe ways to
   * display this.
   */
  exponent: number;
  /**
   * Precise real-world size in meters (e.g. 1.2742e7 for Earth's diameter),
   * used for the horizontal ruler's positioning/zoom math and for compare-mode
   * ratios. log10(scaleMeters) always rounds to `exponent`; `exponent` stays
   * the source of truth for the rounded "10^n m" label (see scaleLabelPlainText)
   * since it renders safely everywhere, while scaleMeters supplies the extra
   * precision the ruler and ratio math need. Falls back to 10^exponent when
   * omitted - see scaleMetersForStop/logMetersForStop.
   */
  scaleMeters?: number;
  name: string;
  fact: string;
  quote?: string;
  attribution?: string;
  /** Real photo URL, once supplied - falls back to the generated placeholder when absent/broken. */
  image?: string;
  /** Attribution for `image` (photographer/source + license), shown under the fact text. */
  imageCredit?: string;
  /**
   * Rendered image height, in px, when this stop is the "dominant" one under
   * the viewport center - see DEFAULT_DISPLAY_HEIGHT_PX / displayHeightForStop.
   */
  displayHeightPx?: number;
}

/**
 * A powers-of-ten journey from the Planck length to the observable universe,
 * grouped in three sixes for the progress rail's "Quantum / Human / Cosmic"
 * labels. Stops without a real photo fall back to /scales/placeholder.
 * quote/attribution are left unset (real Lightman quotes are out of scope) -
 * StarInfoPanel-style optional rendering is still implemented so they light
 * up the moment text is added.
 */
export const SCALE_STOPS: ScaleStop[] = [
  // Quantum (0-5)
  {
    id: 'planck-length',
    exponent: -35,
    scaleMeters: 1.616e-35,
    name: 'Planck length',
    fact: 'Below this length, the very idea of distance stops making sense - space itself is thought to lose meaning at finer scales.',
    image: '/scales/planck-length.png',
    imageCredit: 'NASA/CXC/M. Weiss, public domain',
  },
  {
    id: 'proton',
    exponent: -15,
    scaleMeters: 1.68e-15,
    name: 'Proton',
    fact: 'A proton is about a hundred thousand times smaller than the atom it sits inside, itself built from three quarks bound by the strong force.',
    image: '/scales/proton.png',
    imageCredit: 'Arpad Horvath, CC BY-SA 4.0, Wikimedia Commons',
  },
  {
    id: 'hydrogen-atom',
    exponent: -10,
    scaleMeters: 1.0e-10,
    name: 'Hydrogen atom',
    fact: 'The simplest atom: one proton, one electron, and mostly empty space - if the nucleus were a marble, the electron would orbit a mile away.',
    image: '/scales/hydrogen-atom.png',
    imageCredit: 'PoorLeno, CC BY-SA 3.0, Wikimedia Commons',
  },
  {
    id: 'dna-helix',
    exponent: -9,
    scaleMeters: 2.0e-9,
    name: 'DNA helix',
    fact: 'The double helix is about 2 nanometers wide, yet the DNA in a single human cell, uncoiled, would stretch roughly two meters.',
    image: '/scales/dna-helix.jpg',
    imageCredit: 'Zephyris, CC BY-SA 3.0, Wikimedia Commons',
  },
  {
    id: 'rhinovirus',
    exponent: -8,
    scaleMeters: 3.0e-8,
    name: 'Rhinovirus',
    fact: 'The virus behind most common colds is barely 30 nanometers across - small enough that millions could fit inside a single human cell.',
    image: '/scales/rhinovirus.jpg',
    imageCredit: 'CDC Public Health Image Library, public domain',
  },
  {
    id: 'amoeba',
    exponent: -5,
    scaleMeters: 1.5e-5,
    name: 'Amoeba',
    fact: 'Amoebas are shape-shifting single cells that move by flowing their own body forward - the smallest free-living species are barely bigger than a human red blood cell.',
    image: '/scales/amoeba.jpg',
    imageCredit: 'Patrick J. Lynch, CC BY-SA 3.0, Wikimedia Commons',
  },
  // Human (6-11)
  {
    id: 'human-hair',
    exponent: -4,
    scaleMeters: 7.0e-5,
    name: 'Human hair',
    fact: 'A single strand is roughly 70 microns across - thin enough that early microscopists used hair width as their everyday ruler.',
    image: '/scales/human-hair.jpg',
    imageCredit: 'Jan Homann, CC BY-SA 3.0, Wikimedia Commons',
  },
  {
    id: 'ant',
    exponent: -2,
    scaleMeters: 5.0e-3,
    name: 'Ant',
    fact: 'A typical ant is about five millimeters long, yet can carry many times its own body weight - relative strength that shrinks away as an animal grows larger.',
    image: '/scales/ant.jpg',
    imageCredit: 'USDA, public domain',
  },
  {
    id: 'human',
    exponent: 0,
    scaleMeters: 1.7,
    name: 'Human being',
    fact: 'At roughly 1.7 meters, a person is the reference point the entire rest of this journey scales against - the only stop measured in a single, whole unit.',
    image: '/scales/human.jpg',
    imageCredit: 'NASA Pioneer plaque, public domain',
  },
  {
    id: 'blue-whale',
    exponent: 1,
    scaleMeters: 27,
    name: 'Blue whale',
    fact: 'The largest animal known to have ever lived, longer than three school buses, with a heart alone the size of a small car.',
    image: '/scales/blue-whale.jpg',
    imageCredit: 'NOAA Photo Library, public domain',
  },
  {
    id: 'mount-everest',
    exponent: 4,
    scaleMeters: 8849,
    name: 'Mount Everest',
    fact: "Earth's tallest peak rises about 8.8 kilometers above sea level - tall enough to graze the cruising altitude of a commercial jet.",
    image: '/scales/everest.jpg',
    imageCredit: 'shrimpo1967, CC BY-SA 2.0, Wikimedia Commons',
  },
  {
    id: 'earth',
    exponent: 7,
    scaleMeters: 1.2742e7,
    name: 'Earth',
    fact: "Our planet's diameter is about 12,700 kilometers - light circles it roughly seven and a half times in a single second.",
    image: '/scales/earth.jpg',
    imageCredit: 'NASA Apollo 17, public domain',
  },
  // Cosmic (12-17)
  {
    id: 'sun',
    exponent: 9,
    scaleMeters: 1.3914e9,
    name: 'Sun',
    fact: 'A hundred and nine Earths could be lined up across the face of the Sun, and light takes about eight minutes to cross the distance to us.',
    image: '/scales/sun.jpg',
    imageCredit: 'NASA/SDO, public domain',
  },
  {
    id: 'solar-system',
    exponent: 13,
    scaleMeters: 9.0e12,
    name: 'Solar System',
    fact: "Out to Neptune's orbit, the Solar System spans about nine trillion meters - and even that is a small fraction of the way to the nearest star.",
    image: '/scales/solar-system.jpg',
    imageCredit: 'NASA, public domain',
  },
  {
    id: 'proxima-centauri',
    exponent: 17,
    scaleMeters: 4.0135e16,
    name: 'Proxima Centauri',
    fact: "The Sun's nearest stellar neighbor lies about 4.24 light-years away - light that crosses the entire Solar System in hours takes over four years to make this one hop.",
    image: '/scales/proxima-centauri.jpg',
    imageCredit: 'ESA/Hubble & NASA, public domain',
  },
  {
    id: 'milky-way',
    exponent: 21,
    scaleMeters: 9.461e20,
    name: 'Milky Way',
    fact: 'Our home galaxy holds a few hundred billion stars in a disk about 100,000 light-years across, one of which is our own.',
    image: '/scales/milky-way.jpg',
    imageCredit: 'ESO/Y. Beletsky, CC BY 4.0',
  },
  {
    id: 'local-group',
    exponent: 23,
    scaleMeters: 9.257e22,
    name: 'Local Group',
    fact: 'The Milky Way belongs to a neighborhood of roughly 80 galaxies called the Local Group, spanning about ten million light-years before the next supercluster begins.',
    image: '/scales/local-group.jpg',
    imageCredit: 'Antonio Ciccolella, CC BY-SA 3.0, Wikimedia Commons',
  },
  {
    id: 'observable-universe',
    exponent: 27,
    scaleMeters: 8.8e26,
    name: 'Observable Universe',
    fact: "The farthest we can see in any direction, limited not by our instruments but by the age of the universe itself - light hasn't had time to reach us from any farther.",
    image: '/scales/observable-universe.jpg',
    imageCredit: 'Pablo Carlos Budassi, CC BY-SA 4.0, Wikimedia Commons',
  },
];

/** ?stop=<id> -> index into SCALE_STOPS. Falls back to 0 for an unknown/missing id. */
export function stopIndexFromId(id: string | null | undefined): number {
  if (!id) return 0;
  const index = SCALE_STOPS.findIndex((s) => s.id === id);
  return index === -1 ? 0 : index;
}

export const SCALE_GROUP_SIZE = 6;
export const SCALE_GROUP_LABELS = ['Quantum', 'Human', 'Cosmic'] as const;

/**
 * Plain-ASCII scale label ("10^-35 m") for contexts that can't render a true
 * superscript: URL query params, alt text, aria-labels. The visual "10⁻³⁵ m"
 * look on the page itself comes from real <sup> markup instead (see
 * ScalesExperience) - not from this string.
 */
export function scaleLabelPlainText(exponent: number): string {
  return `10^${exponent} m`;
}

/** Placeholder image URL for a stop - the only image source until real photos are supplied. */
export function placeholderImageUrl(stop: ScaleStop): string {
  const scale = scaleLabelPlainText(stop.exponent);
  return `/scales/placeholder?name=${encodeURIComponent(stop.name)}&scale=${encodeURIComponent(scale)}`;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

// Deep indigo-black (the "small end") warming through violet toward a dark
// amber (the "cosmic end") - the short way around the hue wheel, so the
// journey shifts blue -> violet -> amber rather than crossing green.
const BACKGROUND_START_HSL: Hsl = { h: 235, s: 65, l: 3 };
const BACKGROUND_END_HSL: Hsl = { h: 28, s: 45, l: 15 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHueShortWay(a: number, b: number, t: number): number {
  const delta = (((b - a + 180) % 360) + 360) % 360 - 180;
  return (a + delta * t + 360) % 360;
}

/** hsl() color string for a stop's background, interpolated by its position in the journey. */
export function backgroundColorForStop(index: number, total = SCALE_STOPS.length): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const h = lerpHueShortWay(BACKGROUND_START_HSL.h, BACKGROUND_END_HSL.h, t);
  const s = lerp(BACKGROUND_START_HSL.s, BACKGROUND_END_HSL.s, t);
  const l = lerp(BACKGROUND_START_HSL.l, BACKGROUND_END_HSL.l, t);
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

/** CSS linear-gradient() spanning the full horizontal track, one color stop per journey stop. */
export function backgroundGradientForTrack(stops: ScaleStop[] = SCALE_STOPS): string {
  const stopStrings = stops.map((_, i) => {
    const t = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0;
    return `${backgroundColorForStop(i, stops.length)} ${t.toFixed(2)}%`;
  });
  return `linear-gradient(90deg, ${stopStrings.join(', ')})`;
}

// --- Horizontal ruler layout -----------------------------------------------
//
// Positions every stop along a single x-axis by a pseudo-log mapping of its
// scale onto px, with extra "breathing room" inserted where the jump in
// order-of-magnitude between neighbors is dramatic (see gapPaddingFactor).
// Because exponent IS log10(scaleMeters) by construction (see ScaleStop),
// the whole layout can work directly in exponent space without re-deriving
// logs from a separately-stored meters value.

export const DEFAULT_DISPLAY_HEIGHT_PX = 500;
export const TARGET_TRACK_WIDTH_PX = 25000;

/** The stop's image height, in px, when it is the dominant/calibrating stop. */
export function displayHeightForStop(stop: ScaleStop): number {
  return stop.displayHeightPx ?? DEFAULT_DISPLAY_HEIGHT_PX;
}

/** Real-world size of a stop, in meters. exponent is log10 of this by definition. */
export function scaleMetersForStop(stop: ScaleStop): number {
  return stop.scaleMeters ?? Math.pow(10, stop.exponent);
}

/**
 * log10 of a stop's precise scaleMeters (or its bare exponent when scaleMeters
 * is omitted) - the real-valued position the ruler/layout math works in,
 * as opposed to the rounded integer `exponent` used only for display labels.
 */
export function logMetersForStop(stop: ScaleStop): number {
  return Math.log10(scaleMetersForStop(stop));
}

/** Meters-per-pixel the ruler would use if this stop alone were dominant. */
export function stopMetersPerPixel(stop: ScaleStop): number {
  return scaleMetersForStop(stop) / displayHeightForStop(stop);
}

/**
 * Extra-spacing multiplier applied to a gap between consecutive stops, based
 * on how many orders of magnitude that gap spans - keeps huge jumps (e.g.
 * Everest -> Earth) from feeling cramped next to tiny ones.
 */
export function gapPaddingFactor(gapOrders: number): number {
  const magnitude = Math.abs(gapOrders);
  if (magnitude > 4) return 1.8;
  if (magnitude > 2) return 1.3;
  return 1;
}

export interface ScaleLayout {
  stops: ScaleStop[];
  /** Px position of each stop, same order/length as stops. xs[0] === 0. */
  xs: number[];
  /** Total scrollable content width (== xs[xs.length - 1]). */
  totalWidth: number;
}

/** Builds the pseudo-log, breathing-room-adjusted x position of every stop. */
export function buildScaleLayout(
  stops: ScaleStop[] = SCALE_STOPS,
  targetWidthPx = TARGET_TRACK_WIDTH_PX
): ScaleLayout {
  if (stops.length === 0) return { stops, xs: [], totalWidth: 0 };
  if (stops.length === 1) return { stops, xs: [0], totalWidth: 0 };

  const weightedGaps: number[] = [];
  let weightedSum = 0;
  for (let i = 1; i < stops.length; i++) {
    const gap = logMetersForStop(stops[i]) - logMetersForStop(stops[i - 1]);
    const weighted = gap * gapPaddingFactor(gap);
    weightedGaps.push(weighted);
    weightedSum += weighted;
  }
  const k = weightedSum > 0 ? targetWidthPx / weightedSum : 0;

  const xs = [0];
  for (let i = 0; i < weightedGaps.length; i++) {
    xs.push(xs[i] + weightedGaps[i] * k);
  }
  return { stops, xs, totalWidth: xs[xs.length - 1] };
}

/** Piecewise-linear interpolation: an arbitrary exponent -> its x position on the ruler. */
export function xForExponent(layout: ScaleLayout, exponent: number): number {
  const { stops, xs } = layout;
  const last = stops.length - 1;
  if (last < 0) return 0;
  if (exponent <= logMetersForStop(stops[0])) return xs[0];
  if (exponent >= logMetersForStop(stops[last])) return xs[last];
  for (let i = 1; i <= last; i++) {
    if (exponent <= logMetersForStop(stops[i])) {
      const e0 = logMetersForStop(stops[i - 1]);
      const e1 = logMetersForStop(stops[i]);
      const t = e1 === e0 ? 0 : (exponent - e0) / (e1 - e0);
      return lerp(xs[i - 1], xs[i], t);
    }
  }
  return xs[last];
}

/** Inverse of xForExponent: an x position on the ruler -> the exponent it represents. */
export function exponentForX(layout: ScaleLayout, x: number): number {
  const { stops, xs } = layout;
  const last = xs.length - 1;
  if (last < 0) return 0;
  if (x <= xs[0]) return logMetersForStop(stops[0]);
  if (x >= xs[last]) return logMetersForStop(stops[last]);
  for (let i = 1; i <= last; i++) {
    if (x <= xs[i]) {
      const x0 = xs[i - 1];
      const x1 = xs[i];
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return lerp(logMetersForStop(stops[i - 1]), logMetersForStop(stops[i]), t);
    }
  }
  return logMetersForStop(stops[last]);
}

/** Index of the stop whose x position is closest to the given x (e.g. viewport center). */
export function dominantIndexForX(layout: ScaleLayout, x: number): number {
  const { xs } = layout;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const dist = Math.abs(xs[i] - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * The ruler's meters-per-pixel at a given x, lerped in log space between the
 * two stops bracketing x so the zoom recalibrates smoothly while scrolling.
 */
export function mppAtX(layout: ScaleLayout, x: number): number {
  const { stops, xs } = layout;
  const last = xs.length - 1;
  if (last < 0) return 1;
  const mppOf = (i: number) => stopMetersPerPixel(stops[i]);
  if (x <= xs[0]) return mppOf(0);
  if (x >= xs[last]) return mppOf(last);
  for (let i = 1; i <= last; i++) {
    if (x <= xs[i]) {
      const t = xs[i] === xs[i - 1] ? 0 : (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      const logMpp = lerp(Math.log10(mppOf(i - 1)), Math.log10(mppOf(i)), t);
      return Math.pow(10, logMpp);
    }
  }
  return mppOf(last);
}

/** A stop's rendered image height, in px, at a given ruler calibration. */
export function imageHeightAtMpp(stop: ScaleStop, mpp: number): number {
  return scaleMetersForStop(stop) / mpp;
}

export const HUMAN_HEIGHT_METERS = 1.7;
/** Below this rendered height, the human silhouette collapses to a dot + caption. */
export const HUMAN_DOT_THRESHOLD_PX = 6;

export interface GridlineInfo {
  exponent: number;
  x: number;
}

/** One gridline per whole power-of-ten within the journey's exponent range. */
export function buildGridlines(layout: ScaleLayout): GridlineInfo[] {
  const { stops } = layout;
  if (stops.length === 0) return [];
  const minExp = Math.ceil(logMetersForStop(stops[0]));
  const maxExp = Math.floor(logMetersForStop(stops[stops.length - 1]));
  const result: GridlineInfo[] = [];
  for (let e = minExp; e <= maxExp; e++) {
    result.push({ exponent: e, x: xForExponent(layout, e) });
  }
  return result;
}

const TICK_STEP_FRACTIONS = [1, 2, 5];

/**
 * Round-number tick marks on the ground line near a given x, spaced roughly
 * `targetSpacingPx` apart at the current calibration - e.g. every nanometer
 * at atomic zoom, every meter at human zoom, every light-year at galactic zoom.
 */
export function localTicks(
  layout: ScaleLayout,
  centerX: number,
  mpp: number,
  viewportWidthPx: number,
  targetSpacingPx = 90
): GridlineInfo[] {
  if (mpp <= 0 || !Number.isFinite(mpp)) return [];
  const stepMeters = targetSpacingPx * mpp;
  const rawExponent = Math.floor(Math.log10(stepMeters));
  let best = Math.pow(10, rawExponent);
  let bestDiff = Infinity;
  for (const exp of [rawExponent, rawExponent + 1]) {
    for (const frac of TICK_STEP_FRACTIONS) {
      const candidate = frac * Math.pow(10, exp);
      const diff = Math.abs(candidate - stepMeters);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
  }
  if (!Number.isFinite(best) || best <= 0) return [];

  const halfWindow = viewportWidthPx;
  const minX = centerX - halfWindow;
  const maxX = centerX + halfWindow;
  const minExp = exponentForX(layout, minX);
  const maxExp = exponentForX(layout, maxX);
  const minMeters = Math.pow(10, minExp);
  const maxMeters = Math.pow(10, maxExp);

  const startN = Math.floor(minMeters / best);
  const endN = Math.ceil(maxMeters / best);
  const ticks: GridlineInfo[] = [];
  const MAX_TICKS = 400;
  for (let n = startN; n <= endN && ticks.length < MAX_TICKS; n++) {
    const meters = n * best;
    if (meters <= 0) continue;
    const exponent = Math.log10(meters);
    ticks.push({ exponent, x: xForExponent(layout, exponent) });
  }
  return ticks;
}

export type RatioFormat =
  | { kind: 'plain'; text: string }
  | { kind: 'scientific'; mantissa: string; exponent: number };

/** Humane formatting of a size ratio: "6,000", "4.3 million", "7.8 billion", or scientific notation. */
export function formatRatio(ratio: number): RatioFormat {
  const r = Math.abs(ratio);
  if (!Number.isFinite(r) || r <= 0) return { kind: 'plain', text: '—' };
  if (r >= 1e12) {
    const exp = Math.floor(Math.log10(r));
    const mantissa = r / Math.pow(10, exp);
    return { kind: 'scientific', mantissa: mantissa.toFixed(1), exponent: exp };
  }
  if (r >= 1e9) return { kind: 'plain', text: `${(r / 1e9).toFixed(1)} billion` };
  if (r >= 1e6) return { kind: 'plain', text: `${(r / 1e6).toFixed(1)} million` };
  if (r >= 100) return { kind: 'plain', text: Math.round(r).toLocaleString('en-US') };
  if (r >= 10) return { kind: 'plain', text: r.toFixed(1) };
  return { kind: 'plain', text: r.toFixed(2) };
}

export interface ComparePaneSizing {
  heightA: number;
  heightB: number;
}

const COMPARE_MIN_HEIGHT_PX = 200;
const COMPARE_MAX_HEIGHT_PX = 400;

/**
 * Pane image heights for compare mode: calibrated off the geometric mean of
 * both stops' scales, then clamped so neither pane ever becomes illegibly
 * small or blows out past the pane - see spec section 6.
 */
export function compareImageHeights(a: ScaleStop, b: ScaleStop): ComparePaneSizing {
  const ma = scaleMetersForStop(a);
  const mb = scaleMetersForStop(b);
  const gmMpp = Math.sqrt(ma * mb) / DEFAULT_DISPLAY_HEIGHT_PX;
  const clamp = (v: number) => Math.max(COMPARE_MIN_HEIGHT_PX, Math.min(COMPARE_MAX_HEIGHT_PX, v));
  return {
    heightA: clamp(ma / gmMpp),
    heightB: clamp(mb / gmMpp),
  };
}

/** The ?compare=<id1>,<id2> query value for two stops. */
export function compareParamForIds(idA: string, idB: string): string {
  return `${idA},${idB}`;
}

/** Parses ?compare=<id1>,<id2> into two valid stop indices, or null if absent/invalid. */
export function parseCompareParam(
  value: string | null | undefined,
  stops: ScaleStop[] = SCALE_STOPS
): [number, number] | null {
  if (!value) return null;
  const parts = value.split(',').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const a = stops.findIndex((s) => s.id === parts[0]);
  const b = stops.findIndex((s) => s.id === parts[1]);
  if (a === -1 || b === -1 || a === b) return null;
  return [a, b];
}
