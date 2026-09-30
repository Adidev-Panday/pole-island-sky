import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import { computeAltAz, computeLocalSiderealTime } from '@/lib/sky';

// Polaris, J2000: RA 02h 31m 49.09s, Dec +89 15' 50.8"
const POLARIS = {
  raHours: 2 + 31 / 60 + 49.09 / 3600,
  decDegrees: 89 + 15 / 60 + 50.8 / 3600,
};

export default function Home() {
  const dateUtc = new Date(REFERENCE_MOMENT);
  const observer = new Astronomy.Observer(
    POLE_ISLAND.latitude,
    POLE_ISLAND.longitude,
    POLE_ISLAND.elevationMeters
  );
  const time = Astronomy.MakeTime(dateUtc);

  const polaris = computeAltAz(POLARIS, observer, dateUtc);
  const sun = computeAltAz(Astronomy.Body.Sun, observer, dateUtc);
  const moon = computeAltAz(Astronomy.Body.Moon, observer, dateUtc);
  const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, time);
  const jupiter = computeAltAz(Astronomy.Body.Jupiter, observer, dateUtc);
  const saturn = computeAltAz(Astronomy.Body.Saturn, observer, dateUtc);
  const venus = computeAltAz(Astronomy.Body.Venus, observer, dateUtc);
  const mars = computeAltAz(Astronomy.Body.Mars, observer, dateUtc);
  const gast = Astronomy.SiderealTime(time);
  const lst = computeLocalSiderealTime(observer, dateUtc);

  const rows: Array<{ label: string; altitudeDeg: number; azimuthDeg: number; extra?: string }> = [
    { label: 'Polaris', ...polaris },
    { label: 'Sun', ...sun },
    {
      label: 'Moon',
      ...moon,
      extra: `${(moonIllumination.phase_fraction * 100).toFixed(1)}% illuminated`,
    },
    { label: 'Jupiter', ...jupiter },
    { label: 'Saturn', ...saturn },
    { label: 'Venus', ...venus },
    { label: 'Mars', ...mars },
  ];

  return (
    <main className="min-h-screen bg-white text-black p-8 font-sans">
      <h1 className="text-xl font-bold mb-1">Pole Island Sky Viewer — verification</h1>
      <p className="text-sm text-gray-600 mb-4">
        {POLE_ISLAND.label} ({POLE_ISLAND.latitude}°N, {POLE_ISLAND.longitude}°E,{' '}
        {POLE_ISLAND.elevationMeters} m) at {REFERENCE_MOMENT} (UTC)
      </p>
      <p className="text-sm text-gray-600 mb-6">
        Local sidereal time: {lst.toFixed(4)} hours (Greenwich sidereal time:{' '}
        {gast.toFixed(4)} hours)
      </p>

      <table className="border-collapse border border-gray-400 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-400 px-3 py-1 text-left">Body</th>
            <th className="border border-gray-400 px-3 py-1 text-left">Altitude (deg)</th>
            <th className="border border-gray-400 px-3 py-1 text-left">Azimuth (deg)</th>
            <th className="border border-gray-400 px-3 py-1 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="border border-gray-400 px-3 py-1">{row.label}</td>
              <td className="border border-gray-400 px-3 py-1">{row.altitudeDeg.toFixed(3)}</td>
              <td className="border border-gray-400 px-3 py-1">{row.azimuthDeg.toFixed(3)}</td>
              <td className="border border-gray-400 px-3 py-1">{row.extra ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        Independent cross-check via JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api),
        COMMAND=599 (Jupiter), CENTER=coord@399, SITE_COORD=-70.15,43.72,0.005,
        2015-08-12 05:30 UTC, QUANTITIES=4 (Azimuth/Elevation). Used Horizons instead
        of Stellarium Web because Horizons exposes a scriptable HTTP API; Stellarium
        Web does not.

        Horizons airless (no refraction):  az 0.177794°, alt -34.061252°
        This app, no refraction:           az 0.175739°, alt -34.062042°
        Delta: 0.0021° az, 0.0008° alt — sub-arcminute agreement.

        Horizons "refracted apparent":     az 0.177794°, alt -33.414639°
        This app, refraction: 'normal':    az 0.175739°, alt -33.655655°
        Delta: ~0.24° alt. Jupiter is ~33-34° BELOW the horizon at this moment
        (Jupiter was near solar conjunction in Aug 2015), so this delta is not a
        geometry error: it's two different, both somewhat arbitrary, refraction
        extrapolation curves for an object with no real atmospheric path. The
        airless comparison above is the meaningful one, and it matches tightly.

        Note on the Sun row: at REFERENCE_MOMENT the Sun is computed at roughly
        -30° altitude (deep night, ~1:30am local), not the -5° to -10° civil-twilight
        range floated when this reference moment was chosen. That original estimate
        was simply wrong for 1:30am at this latitude/date — the sun's daily minimum
        altitude in mid-August at 43.72N is well past -20°. A dark sky with the Sun
        far below the horizon is also the better match for the book's description of
        being "overwhelmed by the stars," so this value looks correct as computed,
        not a bug to fix.

        Prompt 2 note: two more of the same kind of mismatch turned up when adding
        the star catalog. Vega (RA 18.6h, dec +38.8) is at ~50deg altitude, az ~282
        (WNW) at REFERENCE_MOMENT, not "near the zenith" — its actual culmination
        this time of year is ~9:56pm EDT the previous evening, about 3.5h before
        01:30am. And the Big Dipper (using Dubhe/Alkaid) sits at ~10-17deg altitude,
        az ~327-353 (just west of due north), not az 0-45/alt 50-70 — at 01:30am in
        August it's near lower culmination, its lowest and most northerly point, not
        high in the sky. Both are confirmed by the standard altitude formula
        sin(alt) = sin(dec)sin(lat) + cos(dec)cos(lat)cos(HA) using the corrected
        local sidereal time above, and by the fact that the seven Dipper stars'
        computed screen positions still trace the correct bowl-quadrilateral +
        bent-handle shape. REFERENCE_MOMENT itself is unchanged; these are just
        the real positions for that placeholder moment, not bugs.
      */}
    </main>
  );
}
