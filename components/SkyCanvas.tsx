'use client';

import { useEffect, useRef } from 'react';
import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import { computeStarAltAz, type CatalogStarRecord } from '@/lib/sky';
import { getSkyRadius, projectAltAz } from '@/lib/projection';

interface StarCatalogFile {
  epoch: number;
  count: number;
  stars: CatalogStarRecord[];
}

interface RenderStar {
  altitudeDeg: number;
  azimuthDeg: number;
  mag: number;
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

function starRadiusPx(mag: number): number {
  return Math.max(0.4, 1.6 * Math.pow(2.512, (6.5 - mag) * 0.28));
}

function starAlpha(mag: number): number {
  return Math.min(1, Math.max(0.15, Math.pow(2.512, (6.5 - mag) * 0.18)));
}

export default function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<RenderStar[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const stars = starsRef.current;
      if (!canvas || !stars) return;

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

      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, width, height);

      const radius = getSkyRadius({ width, height });
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

      ctx.fillStyle = '#ffffff';
      for (const star of stars) {
        const point = projectAltAz(
          { altitudeDeg: star.altitudeDeg, azimuthDeg: star.azimuthDeg },
          { width, height }
        );
        if (!point) continue;

        ctx.globalAlpha = starAlpha(star.mag);
        ctx.beginPath();
        ctx.arc(point.x, point.y, starRadiusPx(star.mag), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    async function load() {
      const observer = new Astronomy.Observer(
        POLE_ISLAND.latitude,
        POLE_ISLAND.longitude,
        POLE_ISLAND.elevationMeters
      );
      const dateUtc = new Date(REFERENCE_MOMENT);

      const response = await fetch('/data/stars.json');
      const catalog: StarCatalogFile = await response.json();
      if (cancelled) return;

      starsRef.current = catalog.stars.map((star) => {
        const { altitudeDeg, azimuthDeg } = computeStarAltAz(
          star,
          observer,
          dateUtc
        );
        return { altitudeDeg, azimuthDeg, mag: star.mag };
      });

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
