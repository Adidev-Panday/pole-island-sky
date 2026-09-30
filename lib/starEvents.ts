import * as Astronomy from 'astronomy-engine';
import { computeStarAltAz, type CatalogStarRecord } from './sky';

const SAMPLE_INTERVAL_MINUTES = 3;
const SAMPLES_PER_DAY = Math.ceil((24 * 60) / SAMPLE_INTERVAL_MINUTES) + 1; // +1 to close the 24h loop

export interface StarRiseTransitSet {
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  /** Always above the horizon on this day - no rise/set, only a transit. */
  circumpolar: boolean;
  /** Never above the horizon on this day - no rise/set/transit worth showing. */
  neverRises: boolean;
}

interface Sample {
  t: Date;
  altDeg: number;
}

function interpolateHorizonCrossing(a: Sample, b: Sample): Date {
  const frac = (0 - a.altDeg) / (b.altDeg - a.altDeg);
  return new Date(a.t.getTime() + frac * (b.t.getTime() - a.t.getTime()));
}

/** Parabolic vertex fit through the peak sample and its two neighbors, for sub-sample transit precision. */
function refineTransit(samples: Sample[], peakIndex: number): Date {
  if (peakIndex <= 0 || peakIndex >= samples.length - 1) return samples[peakIndex].t;
  const y0 = samples[peakIndex - 1].altDeg;
  const y1 = samples[peakIndex].altDeg;
  const y2 = samples[peakIndex + 1].altDeg;
  const denom = y0 - 2 * y1 + y2;
  if (denom === 0) return samples[peakIndex].t;
  const offsetSamples = (0.5 * (y0 - y2)) / denom; // fraction of a sample interval, roughly [-0.5, 0.5]
  const ms = samples[peakIndex].t.getTime() + offsetSamples * SAMPLE_INTERVAL_MINUTES * 60000;
  return new Date(ms);
}

/**
 * Rise/transit/set for a fixed star on a given calendar day, by sampling
 * altitude every few minutes across the day and interpolating horizon
 * crossings + the altitude peak. astronomy-engine's SearchRiseSet only
 * covers named solar-system bodies, not arbitrary catalog stars, so this
 * reuses the already-correct computeStarAltAz (proper motion + precession)
 * numerically rather than re-deriving hour-angle trig with its own,
 * potentially-diverging, precession handling.
 *
 * Horizon is geometric (altitude 0), matching how the rest of the app draws
 * the horizon circle - not the refraction-adjusted -0.5667deg convention
 * used for solar/lunar rise/set.
 */
export function computeStarRiseTransitSet(
  star: CatalogStarRecord,
  observer: Astronomy.Observer,
  dayStartUtc: Date
): StarRiseTransitSet {
  const samples: Sample[] = [];
  for (let i = 0; i < SAMPLES_PER_DAY; i++) {
    const t = new Date(dayStartUtc.getTime() + i * SAMPLE_INTERVAL_MINUTES * 60000);
    samples.push({ t, altDeg: computeStarAltAz(star, observer, t).altitudeDeg });
  }

  const circumpolar = samples.every((s) => s.altDeg >= 0);
  const neverRises = samples.every((s) => s.altDeg < 0);

  let rise: Date | null = null;
  let set: Date | null = null;
  if (!circumpolar && !neverRises) {
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const cur = samples[i];
      if (rise === null && prev.altDeg < 0 && cur.altDeg >= 0) {
        rise = interpolateHorizonCrossing(prev, cur);
      }
      if (set === null && prev.altDeg >= 0 && cur.altDeg < 0) {
        set = interpolateHorizonCrossing(prev, cur);
      }
    }
  }

  let peakIndex = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].altDeg > samples[peakIndex].altDeg) peakIndex = i;
  }
  const transit = neverRises ? null : refineTransit(samples, peakIndex);

  return { rise, transit, set, circumpolar, neverRises };
}
