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
  name: string;
  fact: string;
  quote?: string;
  attribution?: string;
  /** Real photo URL, once supplied - falls back to the generated placeholder when absent/broken. */
  image?: string;
}

/**
 * A powers-of-ten journey from the Planck length to the observable universe,
 * grouped in three sixes for the progress rail's "Quantum / Human / Cosmic"
 * labels. Real photographs are out of scope (see prompt) - every stop
 * renders through /scales/placeholder until real images are supplied, and
 * quote/attribution are left unset (real Lightman quotes are also out of
 * scope) - StarInfoPanel-style optional rendering is still implemented so
 * they light up the moment text is added.
 */
export const SCALE_STOPS: ScaleStop[] = [
  // Quantum (0-5)
  {
    id: 'planck-length',
    exponent: -35,
    name: 'Planck length',
    fact: 'Below this length, the very idea of distance stops making sense - space itself is thought to lose meaning at finer scales.',
  },
  {
    id: 'proton',
    exponent: -15,
    name: 'Proton',
    fact: 'A proton is about a hundred thousand times smaller than the atom it sits inside, itself built from three quarks bound by the strong force.',
  },
  {
    id: 'hydrogen-atom',
    exponent: -10,
    name: 'Hydrogen atom',
    fact: 'The simplest atom: one proton, one electron, and mostly empty space - if the nucleus were a marble, the electron would orbit a mile away.',
  },
  {
    id: 'dna-helix',
    exponent: -9,
    name: 'DNA helix',
    fact: 'The double helix is about 2 nanometers wide, yet the DNA in a single human cell, uncoiled, would stretch roughly two meters.',
  },
  {
    id: 'virus',
    exponent: -7,
    name: 'Virus',
    fact: 'Most viruses are too small to see with a light microscope - a few thousand laid end to end would barely cross a human hair.',
  },
  {
    id: 'red-blood-cell',
    exponent: -5,
    name: 'Red blood cell',
    fact: 'About 25 trillion of these disks circulate in an adult body, each one small enough that a hundred could fit across a single grain of salt.',
  },
  // Human (6-11)
  {
    id: 'human-hair',
    exponent: -4,
    name: 'Human hair',
    fact: 'A single strand is roughly 70 microns across - thin enough that early microscopists used hair width as their everyday ruler.',
  },
  {
    id: 'grain-of-sand',
    exponent: -3,
    name: 'Grain of sand',
    fact: 'A typical grain is half a millimeter, worn down over centuries from rock, shell, or coral into something small enough to slip through your fingers.',
  },
  {
    id: 'apple',
    exponent: -1,
    name: 'Apple',
    fact: 'An ordinary apple, held in one hand, sits almost exactly at the geometric midpoint between the width of an atom and the width of the observable universe.',
  },
  {
    id: 'human',
    exponent: 0,
    name: 'Human being',
    fact: 'At roughly 1.7 meters, a person is the reference point the entire rest of this journey scales against - the only stop measured in a single, whole unit.',
  },
  {
    id: 'blue-whale',
    exponent: 1,
    name: 'Blue whale',
    fact: 'The largest animal known to have ever lived, longer than three school buses, with a heart alone the size of a small car.',
  },
  {
    id: 'mount-everest',
    exponent: 4,
    name: 'Mount Everest',
    fact: "Earth's tallest peak rises about 8.8 kilometers above sea level - tall enough to graze the cruising altitude of a commercial jet.",
  },
  // Cosmic (12-17)
  {
    id: 'earth',
    exponent: 7,
    name: 'Earth',
    fact: "Our planet's diameter is about 12,700 kilometers - light circles it roughly seven and a half times in a single second.",
  },
  {
    id: 'sun',
    exponent: 9,
    name: 'Sun',
    fact: 'A hundred and nine Earths could be lined up across the face of the Sun, and light takes about eight minutes to cross the distance to us.',
  },
  {
    id: 'solar-system',
    exponent: 13,
    name: 'Solar System',
    fact: "Out to Neptune's orbit, the Solar System spans about nine trillion meters - and even that is a small fraction of the way to the nearest star.",
  },
  {
    id: 'milky-way',
    exponent: 21,
    name: 'Milky Way',
    fact: 'Our home galaxy holds a few hundred billion stars in a disk about 100,000 light-years across, one of which is our own.',
  },
  {
    id: 'virgo-supercluster',
    exponent: 23,
    name: 'Virgo Supercluster',
    fact: 'The Milky Way is one of roughly a hundred galaxy groups bound loosely together into this supercluster, itself just one thread in a larger cosmic web.',
  },
  {
    id: 'observable-universe',
    exponent: 27,
    name: 'Observable Universe',
    fact: "The farthest we can see in any direction, limited not by our instruments but by the age of the universe itself - light hasn't had time to reach us from any farther.",
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
