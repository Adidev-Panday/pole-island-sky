import * as Astronomy from 'astronomy-engine';

export interface CatalogStar {
  raHours: number;
  decDegrees: number;
}

export interface AltAz {
  altitudeDeg: number;
  azimuthDeg: number;
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
