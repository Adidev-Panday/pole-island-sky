/**
 * Curated bright stars that always get a label (when above the altitude
 * cutoff), independent of magnitude-based star rendering. Proper names must
 * match data/stars.json's `proper` field exactly (verified against the
 * HYG catalog at time of writing).
 */
export const LABELED_STAR_NAMES: ReadonlySet<string> = new Set([
  'Polaris',
  'Vega',
  'Deneb',
  'Altair',
  'Arcturus',
  'Antares',
  'Capella',
  'Rigel',
  'Betelgeuse',
  'Sirius',
  'Procyon',
  'Aldebaran',
  'Spica',
  'Fomalhaut',
]);

/** Stars never get a label below this altitude, even if above the horizon. */
export const STAR_LABEL_MIN_ALTITUDE_DEG = 5;

/** Fraction of a constellation's line segments that must be above horizon to label it. */
export const CONSTELLATION_LABEL_MIN_VISIBLE_FRACTION = 0.5;
