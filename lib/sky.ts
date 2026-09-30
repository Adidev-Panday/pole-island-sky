import * as Astronomy from 'astronomy-engine';

export interface CatalogStar {
  raHours: number;
  decDegrees: number;
}

export interface AltAz {
  altitudeDeg: number;
  azimuthDeg: number;
}

/** A star from the compiled HYG catalog (see scripts/build-star-catalog.ts). */
export interface CatalogStarRecord {
  id: number;
  ra: number; // hours, J2000
  dec: number; // degrees, J2000
  mag: number;
  ci: number | null;
  spect: string | null;
  pmra: number | null; // mas/yr
  pmdec: number | null; // mas/yr
  proper: string | null;
  bayer: string | null;
  con: string | null;
}

const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_JULIAN_YEAR = 365.25 * 86400 * 1000;

/**
 * Advances a catalog star's J2000 RA/Dec to the date of observation using
 * its catalog proper motion. pmra is assumed to already include the cos(dec)
 * factor (the standard Hipparcos/Gaia convention), so it's divided back out
 * to get the actual change in RA angle.
 */
export function applyProperMotion(
  star: CatalogStarRecord,
  dateUtc: Date
): CatalogStar {
  if (star.pmra == null || star.pmdec == null) {
    return { raHours: star.ra, decDegrees: star.dec };
  }

  const deltaYears = (dateUtc.getTime() - J2000_EPOCH_MS) / MS_PER_JULIAN_YEAR;
  const decRad = (star.dec * Math.PI) / 180;

  const raHours =
    star.ra + (star.pmra * deltaYears) / (Math.cos(decRad) * 3600 * 1000 * 15);
  const decDegrees = star.dec + (star.pmdec * deltaYears) / (3600 * 1000);

  return { raHours, decDegrees };
}

/** Applies proper motion, then computes topocentric alt/az for a catalog star. */
export function computeStarAltAz(
  star: CatalogStarRecord,
  observer: Astronomy.Observer,
  dateUtc: Date
): AltAz {
  const ofDate = applyProperMotion(star, dateUtc);
  return computeAltAz(ofDate, observer, dateUtc);
}

function isCatalogStar(
  target: Astronomy.Body | CatalogStar
): target is CatalogStar {
  return typeof target === 'object';
}

/**
 * Computes topocentric altitude/azimuth for either an astronomy-engine Body
 * or an arbitrary catalog star given in J2000 equatorial coordinates.
 *
 * Catalog coordinates are precessed/nutated from J2000 (EQJ) to the equator
 * and equinox of the observation date (EQD) before the horizontal transform,
 * since Astronomy.Horizon expects of-date RA/Dec.
 *
 * @param refraction Passed through to Astronomy.Horizon. Defaults to 'normal'
 *   (matches every other call site: rendering, star positions). Pass `null`
 *   explicitly for the geometric (airless) altitude - astronomy-engine's
 *   'normal' refraction model keeps extrapolating a bend well below the
 *   horizon (confirmed: ~0.5deg at -18deg, ~0.4deg at -34deg), which isn't
 *   physically meaningful there and throws off readouts of standard
 *   geometric thresholds like astronomical twilight (sun center at -18deg),
 *   which SearchAltitude itself computes without refraction. (Note: a
 *   JS default parameter only kicks in for an omitted or `undefined`
 *   argument, so the "no refraction" sentinel has to be `null`, not
 *   `undefined`.)
 */
export function computeAltAz(
  target: Astronomy.Body | CatalogStar,
  observer: Astronomy.Observer,
  dateUtc: Date,
  refraction: string | null = 'normal'
): AltAz {
  const time = Astronomy.MakeTime(dateUtc);

  let raOfDate: number;
  let decOfDate: number;

  if (isCatalogStar(target)) {
    const j2000Vector = Astronomy.VectorFromSphere(
      new Astronomy.Spherical(target.decDegrees, target.raHours * 15, 1),
      time
    );
    const j2000ToOfDate = Astronomy.Rotation_EQJ_EQD(time);
    const ofDateVector = Astronomy.RotateVector(j2000ToOfDate, j2000Vector);
    const equOfDate = Astronomy.EquatorFromVector(ofDateVector);
    raOfDate = equOfDate.ra;
    decOfDate = equOfDate.dec;
  } else {
    const equOfDate = Astronomy.Equator(target, time, observer, true, true);
    raOfDate = equOfDate.ra;
    decOfDate = equOfDate.dec;
  }

  const horizontal = Astronomy.Horizon(
    time,
    observer,
    raOfDate,
    decOfDate,
    refraction ?? undefined
  );

  return {
    altitudeDeg: horizontal.altitude,
    azimuthDeg: horizontal.azimuth,
  };
}

/**
 * Local sidereal time in hours [0, 24).
 *
 * Astronomy.SiderealTime() returns Greenwich Apparent Sidereal Time (GAST),
 * not local sidereal time - this adds the observer's longitude (east
 * positive) to get LST.
 */
export function computeLocalSiderealTime(
  observer: Astronomy.Observer,
  dateUtc: Date
): number {
  const gast = Astronomy.SiderealTime(Astronomy.MakeTime(dateUtc));
  return (((gast + observer.longitude / 15) % 24) + 24) % 24;
}

const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

/** Names the moon's phase from Astronomy.MoonPhase()'s angle (0=new, 180=full). */
export function moonPhaseName(phaseAngleDeg: number): string {
  const phase = ((phaseAngleDeg % 360) + 360) % 360;
  const index = Math.round(phase / 45) % 8;
  return MOON_PHASE_NAMES[index];
}
