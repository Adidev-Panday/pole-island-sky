const DEG2RAD = Math.PI / 180;

// mag/airmass for roughly clean Maine coastal air.
const EXTINCTION_COEFFICIENT_MAG_PER_AIRMASS = 0.28;

/**
 * Relative atmospheric path length (airmass) for a given altitude.
 * Kasten & Young (1989), valid down to the horizon (unlike the simple
 * sec(z) formula, which blows up near alt=0).
 */
export function airmass(altitudeDeg: number): number {
  const altRad = altitudeDeg * DEG2RAD;
  return 1 / (Math.sin(altRad) + 0.50572 * Math.pow(altitudeDeg + 6.07995, -1.6364));
}

function extinctionMag(altitudeDeg: number): number {
  return EXTINCTION_COEFFICIENT_MAG_PER_AIRMASS * airmass(altitudeDeg);
}

/**
 * Magnitude after atmospheric extinction, normalized so zenith (alt=90) is
 * unchanged: extinctionMag(90) ~ the coefficient itself (airmass ~ 1), which
 * is subtracted back out.
 */
export function effectiveMagnitude(mag: number, altitudeDeg: number): number {
  return mag + extinctionMag(altitudeDeg) - EXTINCTION_COEFFICIENT_MAG_PER_AIRMASS;
}

const HORIZON_FADE_MIN_ALTITUDE_DEG = 5;
const HORIZON_FADE_MAX_ALTITUDE_DEG = 15;

/** 0 at/below 5deg altitude, 1 at/above 15deg, linear in between. */
export function horizonFadeFactor(altitudeDeg: number): number {
  if (altitudeDeg <= HORIZON_FADE_MIN_ALTITUDE_DEG) return 0;
  if (altitudeDeg >= HORIZON_FADE_MAX_ALTITUDE_DEG) return 1;
  return (
    (altitudeDeg - HORIZON_FADE_MIN_ALTITUDE_DEG) /
    (HORIZON_FADE_MAX_ALTITUDE_DEG - HORIZON_FADE_MIN_ALTITUDE_DEG)
  );
}
