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
 */
export function computeAltAz(
  target: Astronomy.Body | CatalogStar,
  observer: Astronomy.Observer,
  dateUtc: Date
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
    'normal'
  );

  return {
    altitudeDeg: horizontal.altitude,
    azimuthDeg: horizontal.azimuth,
  };
}
