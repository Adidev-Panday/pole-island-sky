'use client';

import { useEffect, useRef } from 'react';
import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import { computeAltAz, computeStarAltAz, type AltAz, type CatalogStarRecord } from '@/lib/sky';
import { getSkyRadius, projectAltAz } from '@/lib/projection';

interface StarCatalogFile {
  epoch: number;
  count: number;
  stars: CatalogStarRecord[];
}

interface ConstellationsFile {
  constellations: Array<{
    abbr: string;
    name: string;
    lines: [number, number][];
  }>;
}

// GeoJSON MultiPolygon per feature: coordinates[polygon][ring][point] = [ra_deg, dec_deg].
interface MilkyWayFile {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: number[][][][];
    };
  }>;
}

interface RenderStar {
  altitudeDeg: number;
  azimuthDeg: number;
  mag: number;
}

interface ConstellationSegment {
  a: AltAz;
  b: AltAz;
}

interface RenderPlanet {
  name: string;
  altitudeDeg: number;
  azimuthDeg: number;
  color: string;
  radiusPx: number;
}

interface RenderMoon {
  altitudeDeg: number;
  azimuthDeg: number;
  illumFraction: number;
  phaseAngleDeg: number;
}

// One ring (closed contour) of a Milky Way brightness band, already altaz'd
// and with any below-horizon vertices clamped to the horizon (altitude 0) so
// the ring stays a valid closed path. See MILKY_WAY_ALPHAS for band order.
interface MilkyWayRing {
  alpha: number;
  vertices: AltAz[];
}

const BACKGROUND_COLOR = '#02030a';
const HORIZON_COLOR = 'rgba(255, 255, 255, 0.08)';
const CARDINAL_COLOR = 'rgba(255, 255, 255, 0.35)';
const CARDINAL_LABEL_OFFSET_PX = 14;
const CARDINALS: Array<[string, number]> = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
];

const CONSTELLATION_LINE_COLOR = 'rgba(120, 170, 255, 0.22)';
const CONSTELLATION_LINE_WIDTH = 0.6;

// Faintest to brightest of the 5 contour bands in mw.json (see build-milkyway.ts).
const MILKY_WAY_ALPHAS = [0.02, 0.035, 0.05, 0.07, 0.09];
const MILKY_WAY_BELOW_HORIZON_SKIP_FRACTION = 0.5;

const PLANET_BODIES = [
  Astronomy.Body.Mercury,
  Astronomy.Body.Venus,
  Astronomy.Body.Mars,
  Astronomy.Body.Jupiter,
  Astronomy.Body.Saturn,
  Astronomy.Body.Uranus,
  Astronomy.Body.Neptune,
];

const PLANET_COLORS: Partial<Record<Astronomy.Body, string>> = {
  [Astronomy.Body.Mercury]: '#c9c0b8',
  [Astronomy.Body.Venus]: '#fdf6d3',
  [Astronomy.Body.Mars]: '#ff7a55',
  [Astronomy.Body.Jupiter]: '#f5d9a3',
  [Astronomy.Body.Saturn]: '#e8d59a',
  [Astronomy.Body.Uranus]: '#a5d8e8',
  [Astronomy.Body.Neptune]: '#6d8ee8',
};

const PLANET_MAGNITUDE_LIMIT = 6.5; // same naked-eye cutoff as the star catalog
const PLANET_SIZE_SCALE = 1.5;
const PLANET_HALO_EXTRA_PX = 2;
const PLANET_HALO_ALPHA = 0.35;

const SUN_COLOR = '#fff2b0';
const SUN_RADIUS_PX = 8;
const SUN_HALO_RADIUS_PX = 20;
const SUN_MIN_ALTITUDE_DEG = -1;

const MOON_LIT_COLOR = '#f4f0e6';
const MOON_DARK_COLOR = '#0a0a12';
const MOON_RADIUS_PX = 6;

function magnitudeToRadiusPx(mag: number): number {
  return Math.max(0.4, 1.6 * Math.pow(2.512, (6.5 - mag) * 0.28));
}

function magnitudeToAlpha(mag: number): number {
  return Math.min(1, Math.max(0.15, Math.pow(2.512, (6.5 - mag) * 0.18)));
}

/**
 * Draws a moon disk with its illuminated phase shaded in.
 *
 * phaseAngleDeg follows Astronomy.MoonPhase's convention: 0 = new, 90 = first
 * quarter, 180 = full, 270 = third quarter. The illuminated region is built
 * from a half-circle (the limb) plus a half-ellipse (the terminator, whose
 * horizontal radius shrinks to 0 at the quarters and flips sides at full).
 * Orientation (which side is lit) uses the simple waxing-right/waning-left
 * convention, not true parallactic angle - good enough without libration
 * modeling, which is out of scope here.
 */
function drawMoonPhase(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  phaseAngleDeg: number
) {
  const phase = ((phaseAngleDeg % 360) + 360) % 360;
  const rad = (phase * Math.PI) / 180;
  const illumFraction = (1 - Math.cos(rad)) / 2;

  ctx.beginPath();
  ctx.fillStyle = MOON_DARK_COLOR;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (illumFraction <= 0.0005) return;

  if (illumFraction >= 0.9995) {
    ctx.beginPath();
    ctx.fillStyle = MOON_LIT_COLOR;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const waxing = phase < 180;
  const rx = r * Math.abs(Math.cos(rad));
  const lessThanHalf = illumFraction < 0.5;

  ctx.save();
  ctx.translate(cx, cy);
  if (!waxing) ctx.scale(-1, 1);

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, lessThanHalf);
  ctx.closePath();
  ctx.fillStyle = MOON_LIT_COLOR;
  ctx.fill();
  ctx.restore();
}

export default function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<RenderStar[] | null>(null);
  const constellationSegmentsRef = useRef<ConstellationSegment[] | null>(null);
  const milkyWayRingsRef = useRef<MilkyWayRing[] | null>(null);
  const planetsRef = useRef<RenderPlanet[] | null>(null);
  const sunRef = useRef<AltAz | null>(null);
  const moonRef = useRef<RenderMoon | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const stars = starsRef.current;
      const constellationSegments = constellationSegmentsRef.current;
      const milkyWayRings = milkyWayRingsRef.current;
      const planets = planetsRef.current;
      const sun = sunRef.current;
      const moon = moonRef.current;
      if (
        !canvas ||
        !stars ||
        !constellationSegments ||
        !milkyWayRings ||
        !planets ||
        !sun ||
        !moon
      ) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const canvasSize = { width, height };

      // 1. Background
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, width, height);

      // 2. Milky Way (additive so overlapping bands brighten toward the core)
      ctx.globalCompositeOperation = 'lighter';
      for (const ring of milkyWayRings) {
        ctx.beginPath();
        ring.vertices.forEach((altAz, i) => {
          const point = projectAltAz(altAz, canvasSize);
          if (!point) return; // shouldn't happen; vertices are pre-clamped >= 0
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${ring.alpha})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // 3. Constellation lines
      ctx.strokeStyle = CONSTELLATION_LINE_COLOR;
      ctx.lineWidth = CONSTELLATION_LINE_WIDTH;
      ctx.beginPath();
      for (const segment of constellationSegments) {
        const pa = projectAltAz(segment.a, canvasSize);
        const pb = projectAltAz(segment.b, canvasSize);
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();

      // 4. Stars
      ctx.fillStyle = '#ffffff';
      for (const star of stars) {
        const point = projectAltAz(
          { altitudeDeg: star.altitudeDeg, azimuthDeg: star.azimuthDeg },
          canvasSize
        );
        if (!point) continue;

        ctx.globalAlpha = magnitudeToAlpha(star.mag);
        ctx.beginPath();
        ctx.arc(point.x, point.y, magnitudeToRadiusPx(star.mag), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 5. Planets
      for (const planet of planets) {
        const point = projectAltAz(
          { altitudeDeg: planet.altitudeDeg, azimuthDeg: planet.azimuthDeg },
          canvasSize
        );
        if (!point) continue;

        ctx.globalAlpha = PLANET_HALO_ALPHA;
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, planet.radiusPx + PLANET_HALO_EXTRA_PX, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, planet.radiusPx, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Sun (only if altitude >= -1deg; clamp to the horizon for projection
      // so a barely-below-horizon sun still renders right at the edge)
      if (sun.altitudeDeg >= SUN_MIN_ALTITUDE_DEG) {
        const clamped = { altitudeDeg: Math.max(0, sun.altitudeDeg), azimuthDeg: sun.azimuthDeg };
        const point = projectAltAz(clamped, canvasSize);
        if (point) {
          const gradient = ctx.createRadialGradient(
            point.x,
            point.y,
            0,
            point.x,
            point.y,
            SUN_HALO_RADIUS_PX
          );
          gradient.addColorStop(0, 'rgba(255, 242, 176, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 242, 176, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, SUN_HALO_RADIUS_PX, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = SUN_COLOR;
          ctx.beginPath();
          ctx.arc(point.x, point.y, SUN_RADIUS_PX, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Moon
      {
        const point = projectAltAz(
          { altitudeDeg: moon.altitudeDeg, azimuthDeg: moon.azimuthDeg },
          canvasSize
        );
        if (point) {
          drawMoonPhase(ctx, point.x, point.y, MOON_RADIUS_PX, moon.phaseAngleDeg);
        }
      }

      // 8. Horizon circle + cardinal labels
      const radius = getSkyRadius(canvasSize);
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.strokeStyle = HORIZON_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = CARDINAL_COLOR;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [label, azimuthDeg] of CARDINALS) {
        const azRad = (azimuthDeg * Math.PI) / 180;
        const labelRadius = radius + CARDINAL_LABEL_OFFSET_PX;
        const x = centerX + labelRadius * Math.sin(azRad);
        const y = centerY - labelRadius * Math.cos(azRad);
        ctx.fillText(label, x, y);
      }
    }

    async function load() {
      const observer = new Astronomy.Observer(
        POLE_ISLAND.latitude,
        POLE_ISLAND.longitude,
        POLE_ISLAND.elevationMeters
      );
      const dateUtc = new Date(REFERENCE_MOMENT);
      const astroTime = Astronomy.MakeTime(dateUtc);

      const [starsResponse, constellationsResponse, milkyWayResponse] = await Promise.all([
        fetch('/data/stars.json'),
        fetch('/data/constellations.json'),
        fetch('/data/mw.json'),
      ]);
      const catalog: StarCatalogFile = await starsResponse.json();
      const constellationsFile: ConstellationsFile = await constellationsResponse.json();
      const milkyWayFile: MilkyWayFile = await milkyWayResponse.json();
      if (cancelled) return;

      // Stars, plus an id -> altaz map so constellation lines can reuse the
      // exact same computation instead of recomputing per shared endpoint.
      const starAltAzById = new Map<number, AltAz>();
      starsRef.current = catalog.stars.map((star) => {
        const altAz = computeStarAltAz(star, observer, dateUtc);
        starAltAzById.set(star.id, altAz);
        return { altitudeDeg: altAz.altitudeDeg, azimuthDeg: altAz.azimuthDeg, mag: star.mag };
      });

      const segments: ConstellationSegment[] = [];
      for (const constellation of constellationsFile.constellations) {
        for (const [idA, idB] of constellation.lines) {
          const a = starAltAzById.get(idA);
          const b = starAltAzById.get(idB);
          if (!a || !b) continue;
          segments.push({ a, b });
        }
      }
      constellationSegmentsRef.current = segments;
      const drawnSegments = segments.filter(
        (s) => s.a.altitudeDeg >= 0 && s.b.altitudeDeg >= 0
      ).length;
      console.log(
        `Constellations: ${constellationsFile.constellations.length}, segments loaded: ${segments.length}, segments above horizon: ${drawnSegments}`
      );

      const milkyWayRings: MilkyWayRing[] = [];
      milkyWayFile.features.forEach((feature, featureIndex) => {
        const alpha = MILKY_WAY_ALPHAS[featureIndex] ?? MILKY_WAY_ALPHAS[MILKY_WAY_ALPHAS.length - 1];
        for (const polygon of feature.geometry.coordinates) {
          for (const ring of polygon) {
            const altAzVertices = ring.map(([raDeg, decDeg]) =>
              computeAltAz({ raHours: raDeg / 15, decDegrees: decDeg }, observer, dateUtc)
            );
            const belowHorizonCount = altAzVertices.filter((v) => v.altitudeDeg < 0).length;
            if (belowHorizonCount / altAzVertices.length > MILKY_WAY_BELOW_HORIZON_SKIP_FRACTION) {
              continue;
            }
            const clamped = altAzVertices.map((v) => ({
              altitudeDeg: Math.max(0, v.altitudeDeg),
              azimuthDeg: v.azimuthDeg,
            }));
            milkyWayRings.push({ alpha, vertices: clamped });
          }
        }
      });
      milkyWayRingsRef.current = milkyWayRings;
      console.log(`Milky Way: ${milkyWayRings.length} contour rings rendered above horizon.`);

      // Gated to the same naked-eye magnitude limit as the star catalog
      // (mag <= 6.5), so e.g. Neptune (mag ~7.8, never naked-eye) doesn't
      // render even when it's geometrically above the horizon. Uranus (mag
      // ~5.8, borderline naked-eye) stays under this cutoff.
      const planets: RenderPlanet[] = [];
      for (const body of PLANET_BODIES) {
        const altAz = computeAltAz(body, observer, dateUtc);
        const mag = Astronomy.Illumination(body, astroTime).mag;
        console.log(`${body}: altitude ${altAz.altitudeDeg.toFixed(2)} deg, mag ${mag.toFixed(2)}`);
        if (altAz.altitudeDeg < 0 || mag > PLANET_MAGNITUDE_LIMIT) continue;
        planets.push({
          name: body,
          altitudeDeg: altAz.altitudeDeg,
          azimuthDeg: altAz.azimuthDeg,
          color: PLANET_COLORS[body] ?? '#ffffff',
          radiusPx: magnitudeToRadiusPx(mag) * PLANET_SIZE_SCALE,
        });
      }
      planetsRef.current = planets;

      sunRef.current = computeAltAz(Astronomy.Body.Sun, observer, dateUtc);
      console.log(`Sun: altitude ${sunRef.current.altitudeDeg.toFixed(2)} deg`);

      const moonAltAz = computeAltAz(Astronomy.Body.Moon, observer, dateUtc);
      const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);
      const moonPhaseAngle = Astronomy.MoonPhase(astroTime);
      moonRef.current = {
        altitudeDeg: moonAltAz.altitudeDeg,
        azimuthDeg: moonAltAz.azimuthDeg,
        illumFraction: moonIllumination.phase_fraction,
        phaseAngleDeg: moonPhaseAngle,
      };
      console.log(
        `Moon: altitude ${moonAltAz.altitudeDeg.toFixed(2)} deg, illuminated ${(
          moonIllumination.phase_fraction * 100
        ).toFixed(1)}%, phase angle ${moonPhaseAngle.toFixed(1)} deg`
      );

      draw();
    }

    load();
    window.addEventListener('resize', draw);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', draw);
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-screen w-screen" />;
}
