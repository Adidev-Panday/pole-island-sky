'use client';

import { useEffect, useRef } from 'react';
import * as Astronomy from 'astronomy-engine';
import { computeAltAz, computeStarAltAz, type AltAz, type CatalogStarRecord } from '@/lib/sky';
import { getSkyRadius, projectAltAz, type ProjectedPoint } from '@/lib/projection';
import {
  LABELED_STAR_NAMES,
  STAR_LABEL_MIN_ALTITUDE_DEG,
  CONSTELLATION_LABEL_MIN_VISIBLE_FRACTION,
} from '@/lib/labels';

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

// Raw (unprojected, date-independent) Milky Way contour ring, loaded once.
interface MilkyWayRawRing {
  alpha: number;
  points: [number, number][]; // [ra_deg, dec_deg]
}

// A constellation's raw (date-independent) line pairs, grouped by name so
// its own visibility fraction / label centroid can be computed at recompute.
interface ConstellationRaw {
  name: string;
  pairs: [number, number][];
}

interface LabeledStar {
  name: string;
  altAz: AltAz;
}

interface ConstellationLabel {
  name: string;
  aboveHorizonEndpoints: AltAz[]; // averaged (in projected space) for the label position
}

// A scene-opening pointer target. altAzPoints is a single point for a named
// star, or many points (averaged in projected space) for the Milky Way arc.
interface ScenePointerTarget {
  label: string;
  altAzPoints: AltAz[];
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

const STAR_LABEL_COLOR = 'rgba(232, 236, 245, 0.55)';
const STAR_LABEL_OFFSET_PX = 8; // NE of the star point (right + up)
const CONSTELLATION_LABEL_COLOR = 'rgba(180, 200, 240, 0.35)';

const SCENE_POINTER_LINE_COLOR = 'rgba(232, 236, 245, 0.6)';
const SCENE_POINTER_LABEL_COLOR = 'rgba(232, 236, 245, 0.9)';
const SCENE_POINTER_LINE_LENGTH_PX = 26;
const SCENE_POINTER_NAMES = ['Vega', 'Deneb', 'Altair', 'Polaris'] as const;
const MILKY_WAY_POINTER_LABEL = 'Milky Way';

// Faintest to brightest of the 5 contour bands in mw.json (see build-milkyway.ts).
const MILKY_WAY_ALPHAS = [0.02, 0.035, 0.05, 0.07, 0.09];
const MILKY_WAY_BELOW_HORIZON_SKIP_FRACTION = 0.5;
const MILKY_WAY_BRIGHTEST_ALPHA = MILKY_WAY_ALPHAS[MILKY_WAY_ALPHAS.length - 1];

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

const TARGET_FPS = 30;
const RECOMPUTE_THROTTLE_MS = 1000 / TARGET_FPS;
const RECOMPUTE_WARN_MS = 33;

function magnitudeToRadiusPx(mag: number): number {
  return Math.max(0.4, 1.6 * Math.pow(2.512, (6.5 - mag) * 0.28));
}

function magnitudeToAlpha(mag: number): number {
  return Math.min(1, Math.max(0.15, Math.pow(2.512, (6.5 - mag) * 0.18)));
}

/** Projects a set of alt/az points and averages the ones above horizon. */
function projectCentroid(
  altAzPoints: AltAz[],
  canvasSize: { width: number; height: number },
  rotationDeg: number
): ProjectedPoint | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const altAz of altAzPoints) {
    const point = projectAltAz(altAz, canvasSize, rotationDeg);
    if (!point) continue;
    sumX += point.x;
    sumY += point.y;
    count++;
  }
  if (count === 0) return null;
  return { x: sumX / count, y: sumY / count };
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

interface SkyCanvasProps {
  dateUtc: Date;
  observer: Astronomy.Observer;
  rotationDeg: number;
  labelsEnabled: boolean;
  scenePointerOpacity: number;
}

export default function SkyCanvas({
  dateUtc,
  observer,
  rotationDeg,
  labelsEnabled,
  scenePointerOpacity,
}: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Latest controlled props, read by the rAF loop (not a recompute trigger by
  // itself - a React re-render never forces a recompute/redraw).
  const dateRef = useRef(dateUtc);
  const observerRef = useRef(observer);
  const rotationRef = useRef(rotationDeg);
  const labelsEnabledRef = useRef(labelsEnabled);
  const scenePointerOpacityRef = useRef(scenePointerOpacity);
  useEffect(() => {
    dateRef.current = dateUtc;
  }, [dateUtc]);
  useEffect(() => {
    observerRef.current = observer;
  }, [observer]);
  useEffect(() => {
    rotationRef.current = rotationDeg;
  }, [rotationDeg]);
  useEffect(() => {
    labelsEnabledRef.current = labelsEnabled;
  }, [labelsEnabled]);
  useEffect(() => {
    scenePointerOpacityRef.current = scenePointerOpacity;
  }, [scenePointerOpacity]);

  // Raw, date-independent source data, loaded once on mount.
  const starsCatalogRef = useRef<CatalogStarRecord[] | null>(null);
  const starByIdRef = useRef<Map<number, CatalogStarRecord> | null>(null);
  const constellationsRawRef = useRef<ConstellationRaw[] | null>(null);
  const milkyWayRawRingsRef = useRef<MilkyWayRawRing[] | null>(null);
  const labeledStarIdsRef = useRef<Map<number, string> | null>(null); // id -> proper name
  const pointerStarIdsRef = useRef<Map<string, number> | null>(null); // proper name -> id

  // Rendered (projected-per-frame-ready) output of the most recent recompute.
  const starsRef = useRef<RenderStar[] | null>(null);
  const constellationSegmentsRef = useRef<ConstellationSegment[] | null>(null);
  const milkyWayRingsRef = useRef<MilkyWayRing[] | null>(null);
  const planetsRef = useRef<RenderPlanet[] | null>(null);
  const sunRef = useRef<AltAz | null>(null);
  const moonRef = useRef<RenderMoon | null>(null);
  const labeledStarsRef = useRef<LabeledStar[] | null>(null);
  const constellationLabelsRef = useRef<ConstellationLabel[] | null>(null);
  const scenePointerTargetsRef = useRef<ScenePointerTarget[] | null>(null);

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
      const labeledStars = labeledStarsRef.current;
      const constellationLabels = constellationLabelsRef.current;
      const scenePointerTargets = scenePointerTargetsRef.current;
      if (
        !canvas ||
        !stars ||
        !constellationSegments ||
        !milkyWayRings ||
        !planets ||
        !sun ||
        !moon ||
        !labeledStars ||
        !constellationLabels ||
        !scenePointerTargets
      ) {
        return;
      }

      const rotation = rotationRef.current;

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
          const point = projectAltAz(altAz, canvasSize, rotation);
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
        const pa = projectAltAz(segment.a, canvasSize, rotation);
        const pb = projectAltAz(segment.b, canvasSize, rotation);
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
          canvasSize,
          rotation
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
          canvasSize,
          rotation
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
        const point = projectAltAz(clamped, canvasSize, rotation);
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
          canvasSize,
          rotation
        );
        if (point) {
          drawMoonPhase(ctx, point.x, point.y, MOON_RADIUS_PX, moon.phaseAngleDeg);
        }
      }

      // 8. Labels (star + constellation), on top of all sky content
      if (labelsEnabledRef.current) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Stars currently called out by a scene pointer get that instead of
        // (redundantly on top of) their permanent label.
        const pointedAtNames =
          scenePointerOpacityRef.current > 0.001
            ? new Set(scenePointerTargets.map((t) => t.label))
            : null;

        ctx.font = '11px sans-serif';
        ctx.fillStyle = STAR_LABEL_COLOR;
        for (const star of labeledStars) {
          if (pointedAtNames?.has(star.name)) continue;
          const point = projectAltAz(star.altAz, canvasSize, rotation);
          if (!point) continue;
          ctx.fillText(star.name, point.x + STAR_LABEL_OFFSET_PX, point.y - STAR_LABEL_OFFSET_PX);
        }

        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = CONSTELLATION_LABEL_COLOR;
        ctx.letterSpacing = '0.8px'; // 0.08em at 10px font
        for (const label of constellationLabels) {
          const centroid = projectCentroid(label.aboveHorizonEndpoints, canvasSize, rotation);
          if (!centroid) continue;
          ctx.fillText(label.name.toUpperCase(), centroid.x, centroid.y);
        }
        ctx.letterSpacing = '0px';
      }

      // 9. Scene-opening pointers
      if (scenePointerOpacityRef.current > 0.001) {
        ctx.globalAlpha = scenePointerOpacityRef.current;
        ctx.strokeStyle = SCENE_POINTER_LINE_COLOR;
        ctx.fillStyle = SCENE_POINTER_LABEL_COLOR;
        ctx.lineWidth = 1;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const target of scenePointerTargets) {
          const anchor = projectCentroid(target.altAzPoints, canvasSize, rotation);
          if (!anchor) continue;
          const endX = anchor.x + SCENE_POINTER_LINE_LENGTH_PX;
          const endY = anchor.y - SCENE_POINTER_LINE_LENGTH_PX;
          ctx.beginPath();
          ctx.moveTo(anchor.x, anchor.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.fillText(target.label, endX + 4, endY);
        }
        ctx.globalAlpha = 1;
      }

      // 10. Horizon circle + cardinal labels (also rotate with the sky)
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
        const azRad = ((azimuthDeg - rotation) * Math.PI) / 180;
        const labelRadius = radius + CARDINAL_LABEL_OFFSET_PX;
        const x = centerX + labelRadius * Math.sin(azRad);
        const y = centerY - labelRadius * Math.cos(azRad);
        ctx.fillText(label, x, y);
      }
    }

    let hasLoggedInitialStats = false;

    function recompute(currentDateUtc: Date, currentObserver: Astronomy.Observer) {
      const starsCatalog = starsCatalogRef.current;
      const constellationsRaw = constellationsRawRef.current;
      const milkyWayRawRings = milkyWayRawRingsRef.current;
      const labeledStarIds = labeledStarIdsRef.current;
      const pointerStarIds = pointerStarIdsRef.current;
      if (!starsCatalog || !constellationsRaw || !milkyWayRawRings || !labeledStarIds || !pointerStarIds) {
        return;
      }

      const start = performance.now();
      const astroTime = Astronomy.MakeTime(currentDateUtc);

      const starAltAzById = new Map<number, AltAz>();
      const starsRender: RenderStar[] = new Array(starsCatalog.length);
      const labeledStars: LabeledStar[] = [];
      for (let i = 0; i < starsCatalog.length; i++) {
        const star = starsCatalog[i];
        const altAz = computeStarAltAz(star, currentObserver, currentDateUtc);
        starAltAzById.set(star.id, altAz);
        starsRender[i] = { altitudeDeg: altAz.altitudeDeg, azimuthDeg: altAz.azimuthDeg, mag: star.mag };
        const labelName = labeledStarIds.get(star.id);
        if (labelName && altAz.altitudeDeg >= STAR_LABEL_MIN_ALTITUDE_DEG) {
          labeledStars.push({ name: labelName, altAz });
        }
      }
      starsRef.current = starsRender;
      labeledStarsRef.current = labeledStars;

      const segments: ConstellationSegment[] = [];
      const constellationLabels: ConstellationLabel[] = [];
      for (const constellation of constellationsRaw) {
        let aboveHorizonSegments = 0;
        const endpointIds = new Set<number>();
        for (const [idA, idB] of constellation.pairs) {
          const a = starAltAzById.get(idA)!;
          const b = starAltAzById.get(idB)!;
          segments.push({ a, b });
          endpointIds.add(idA);
          endpointIds.add(idB);
          if (a.altitudeDeg >= 0 && b.altitudeDeg >= 0) aboveHorizonSegments++;
        }
        const visible =
          constellation.pairs.length > 0 &&
          aboveHorizonSegments / constellation.pairs.length >= CONSTELLATION_LABEL_MIN_VISIBLE_FRACTION;
        if (visible) {
          const aboveHorizonEndpoints: AltAz[] = [];
          for (const id of endpointIds) {
            const altAz = starAltAzById.get(id)!;
            if (altAz.altitudeDeg >= 0) aboveHorizonEndpoints.push(altAz);
          }
          constellationLabels.push({ name: constellation.name, aboveHorizonEndpoints });
        }
      }
      constellationSegmentsRef.current = segments;
      constellationLabelsRef.current = constellationLabels;

      const milkyWayRings: MilkyWayRing[] = [];
      const brightestMilkyWayPoints: AltAz[] = [];
      for (const rawRing of milkyWayRawRings) {
        const altAzVertices = rawRing.points.map(([raDeg, decDeg]) =>
          computeAltAz({ raHours: raDeg / 15, decDegrees: decDeg }, currentObserver, currentDateUtc)
        );
        if (rawRing.alpha === MILKY_WAY_BRIGHTEST_ALPHA) {
          for (const v of altAzVertices) {
            if (v.altitudeDeg >= 0) brightestMilkyWayPoints.push(v);
          }
        }
        const belowHorizonCount = altAzVertices.filter((v) => v.altitudeDeg < 0).length;
        if (belowHorizonCount / altAzVertices.length > MILKY_WAY_BELOW_HORIZON_SKIP_FRACTION) {
          continue;
        }
        const clamped = altAzVertices.map((v) => ({
          altitudeDeg: Math.max(0, v.altitudeDeg),
          azimuthDeg: v.azimuthDeg,
        }));
        milkyWayRings.push({ alpha: rawRing.alpha, vertices: clamped });
      }
      milkyWayRingsRef.current = milkyWayRings;

      const scenePointerTargets: ScenePointerTarget[] = [];
      for (const name of SCENE_POINTER_NAMES) {
        const id = pointerStarIds.get(name);
        const altAz = id !== undefined ? starAltAzById.get(id) : undefined;
        if (altAz && altAz.altitudeDeg >= 0) {
          scenePointerTargets.push({ label: name, altAzPoints: [altAz] });
        }
      }
      if (brightestMilkyWayPoints.length > 0) {
        scenePointerTargets.push({ label: MILKY_WAY_POINTER_LABEL, altAzPoints: brightestMilkyWayPoints });
      }
      scenePointerTargetsRef.current = scenePointerTargets;

      const planets: RenderPlanet[] = [];
      const planetLogLines: string[] = [];
      for (const body of PLANET_BODIES) {
        const altAz = computeAltAz(body, currentObserver, currentDateUtc);
        const mag = Astronomy.Illumination(body, astroTime).mag;
        planetLogLines.push(`${body}: altitude ${altAz.altitudeDeg.toFixed(2)} deg, mag ${mag.toFixed(2)}`);
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

      sunRef.current = computeAltAz(Astronomy.Body.Sun, currentObserver, currentDateUtc);

      const moonAltAz = computeAltAz(Astronomy.Body.Moon, currentObserver, currentDateUtc);
      const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);
      const moonPhaseAngle = Astronomy.MoonPhase(astroTime);
      moonRef.current = {
        altitudeDeg: moonAltAz.altitudeDeg,
        azimuthDeg: moonAltAz.azimuthDeg,
        illumFraction: moonIllumination.phase_fraction,
        phaseAngleDeg: moonPhaseAngle,
      };

      const elapsed = performance.now() - start;
      if (elapsed > RECOMPUTE_WARN_MS) {
        console.warn(
          `Sky recompute took ${elapsed.toFixed(1)}ms (budget ${RECOMPUTE_WARN_MS}ms for ${TARGET_FPS}fps) - may need a Web Worker (see prompt 6).`
        );
      }

      if (!hasLoggedInitialStats) {
        console.log(
          `Constellations: ${constellationsRaw.length}, segments loaded: ${segments.length}, segments above horizon: ${
            segments.filter((s) => s.a.altitudeDeg >= 0 && s.b.altitudeDeg >= 0).length
          }`
        );
        console.log(`Milky Way: ${milkyWayRings.length} contour rings rendered above horizon.`);
        for (const line of planetLogLines) console.log(line);
        console.log(`Sun: altitude ${sunRef.current.altitudeDeg.toFixed(2)} deg`);
        console.log(
          `Moon: altitude ${moonAltAz.altitudeDeg.toFixed(2)} deg, illuminated ${(
            moonIllumination.phase_fraction * 100
          ).toFixed(1)}%, phase angle ${moonPhaseAngle.toFixed(1)} deg`
        );
        console.log(
          `Labels: ${labeledStars.length} stars, ${constellationLabels.length} constellations. Scene pointer targets: ${scenePointerTargets
            .map((t) => t.label)
            .join(', ')}`
        );
        hasLoggedInitialStats = true;
      }

      draw();
    }

    async function loadRawData() {
      const [starsResponse, constellationsResponse, milkyWayResponse] = await Promise.all([
        fetch('/data/stars.json'),
        fetch('/data/constellations.json'),
        fetch('/data/mw.json'),
      ]);
      const catalog: StarCatalogFile = await starsResponse.json();
      const constellationsFile: ConstellationsFile = await constellationsResponse.json();
      const milkyWayFile: MilkyWayFile = await milkyWayResponse.json();
      if (cancelled) return;

      starsCatalogRef.current = catalog.stars;
      const starById = new Map<number, CatalogStarRecord>();
      for (const star of catalog.stars) starById.set(star.id, star);
      starByIdRef.current = starById;

      const labeledStarIds = new Map<number, string>();
      const pointerStarIds = new Map<string, number>();
      for (const star of catalog.stars) {
        if (!star.proper) continue;
        if (LABELED_STAR_NAMES.has(star.proper)) {
          labeledStarIds.set(star.id, star.proper);
        }
        if ((SCENE_POINTER_NAMES as readonly string[]).includes(star.proper)) {
          pointerStarIds.set(star.proper, star.id);
        }
      }
      labeledStarIdsRef.current = labeledStarIds;
      pointerStarIdsRef.current = pointerStarIds;

      const constellationsRaw: ConstellationRaw[] = [];
      for (const constellation of constellationsFile.constellations) {
        const pairs = constellation.lines.filter(
          ([idA, idB]) => starById.has(idA) && starById.has(idB)
        );
        constellationsRaw.push({ name: constellation.name, pairs });
      }
      constellationsRawRef.current = constellationsRaw;

      const milkyWayRawRings: MilkyWayRawRing[] = [];
      milkyWayFile.features.forEach((feature, featureIndex) => {
        const alpha =
          MILKY_WAY_ALPHAS[featureIndex] ?? MILKY_WAY_ALPHAS[MILKY_WAY_ALPHAS.length - 1];
        for (const polygon of feature.geometry.coordinates) {
          for (const ring of polygon) {
            milkyWayRawRings.push({
              alpha,
              points: ring.map(([raDeg, decDeg]) => [raDeg, decDeg]),
            });
          }
        }
      });
      milkyWayRawRingsRef.current = milkyWayRawRings;

      // First paint, immediately (not throttle-delayed).
      recompute(dateRef.current, observerRef.current);
    }

    let rafId = 0;
    let lastComputeAtMs: number | null = null;
    let lastComputedDateMs: number | null = null;
    let lastDrawnRotation = rotationRef.current;
    let lastDrawnLabelsEnabled = labelsEnabledRef.current;
    let lastDrawnPointerOpacity = scenePointerOpacityRef.current;

    function tick() {
      rafId = requestAnimationFrame(tick);

      if (!starsCatalogRef.current) return; // raw data not loaded yet

      const currentDate = dateRef.current;
      const currentDateMs = currentDate.getTime();
      const dateChanged = currentDateMs !== lastComputedDateMs;

      const currentRotation = rotationRef.current;
      const currentLabelsEnabled = labelsEnabledRef.current;
      const currentPointerOpacity = scenePointerOpacityRef.current;
      const redrawOnlyChanged =
        currentRotation !== lastDrawnRotation ||
        currentLabelsEnabled !== lastDrawnLabelsEnabled ||
        currentPointerOpacity !== lastDrawnPointerOpacity;

      if (!dateChanged && !redrawOnlyChanged) return; // nothing changed - do nothing

      if (dateChanged) {
        const now = performance.now();
        if (lastComputeAtMs !== null && now - lastComputeAtMs < RECOMPUTE_THROTTLE_MS) return;
        lastComputeAtMs = now;
        lastComputedDateMs = currentDateMs;
        recompute(currentDate, observerRef.current); // ends with draw()
      } else {
        // Rotation/labels/pointer-opacity changed but not the date: cheap
        // reprojection only, never throttled by the astronomy-recompute budget.
        draw();
      }
      lastDrawnRotation = currentRotation;
      lastDrawnLabelsEnabled = currentLabelsEnabled;
      lastDrawnPointerOpacity = currentPointerOpacity;
    }

    function handleResize() {
      // Reproject with whatever was last computed; never recompute astronomy
      // just because the window resized.
      draw();
    }

    loadRawData();
    rafId = requestAnimationFrame(tick);
    window.addEventListener('resize', handleResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-screen w-screen" />;
}
