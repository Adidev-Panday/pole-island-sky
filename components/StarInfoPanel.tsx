'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import { computeStarAltAz, type CatalogStarRecord } from '@/lib/sky';
import { computeStarRiseTransitSet } from '@/lib/starEvents';
import {
  formatDistanceLightYears,
  formatLuminosity,
  spectralClassDescription,
  starDisplayName,
} from '@/lib/starDisplay';
import { CASCO_BAY_TIME_ZONE, formatLocalDate, formatLocalTime, localMidnightUtc } from '@/lib/time';

interface StarInfoPanelProps {
  star: CatalogStarRecord;
  observer: Astronomy.Observer;
  dateUtc: Date;
  onClose: () => void;
}

interface ConstellationsFile {
  constellations: Array<{ abbr: string; name: string }>;
}

function parseDateParts(yyyyMmDd: string): [number, number, number] {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return [y, m, d];
}

function formatClock(date: Date | null): string {
  if (!date) return '--:--';
  return formatLocalTime(date, CASCO_BAY_TIME_ZONE);
}

export default function StarInfoPanel({ star, observer, dateUtc, onClose }: StarInfoPanelProps) {
  const [constellationNames, setConstellationNames] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/constellations.json')
      .then((r) => r.json())
      .then((data: ConstellationsFile) => {
        if (cancelled) return;
        setConstellationNames(new Map(data.constellations.map((c) => [c.abbr, c.name])));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const altAz = computeStarAltAz(star, observer, dateUtc);
  const belowHorizon = altAz.altitudeDeg < 0;

  const localDate = formatLocalDate(dateUtc, CASCO_BAY_TIME_ZONE);
  const riseTransitSet = useMemo(() => {
    const dayStart = localMidnightUtc(...parseDateParts(localDate), CASCO_BAY_TIME_ZONE);
    return computeStarRiseTransitSet(star, observer, dayStart);
  }, [star, observer, localDate]);

  const name = starDisplayName(star);
  const constellationName = star.con ? constellationNames?.get(star.con) ?? star.con : null;
  const luminosityText = formatLuminosity(star.lum);
  const spectralDesc = spectralClassDescription(star.spect);

  return (
    <div
      style={{
        position: 'fixed',
        top: 48,
        right: 16,
        zIndex: 20,
        width: 'min(300px, 90vw)',
        background: 'rgba(8, 10, 20, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 4,
        padding: 20,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        lineHeight: 1.6,
        color: '#e8ecf5',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {name}
          </h2>
          {constellationName && (
            <div style={{ fontSize: 12, color: 'rgba(232, 236, 245, 0.5)', marginTop: 2 }}>
              in {constellationName}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(232, 236, 245, 0.6)',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          &times;
        </button>
      </div>

      <p style={{ marginTop: 14, marginBottom: 4, color: 'rgba(232, 236, 245, 0.85)' }}>
        Apparent magnitude {star.mag.toFixed(2)}
      </p>
      <p style={{ marginTop: 0, marginBottom: 4, color: 'rgba(232, 236, 245, 0.85)' }}>
        {formatDistanceLightYears(star.dist)}
      </p>
      {luminosityText && (
        <p style={{ marginTop: 0, marginBottom: 4, color: 'rgba(232, 236, 245, 0.85)' }}>
          {luminosityText}
        </p>
      )}
      {star.spect && (
        <p style={{ marginTop: 0, marginBottom: 4, color: 'rgba(232, 236, 245, 0.85)' }}>
          {star.spect}
          {spectralDesc && ` (${spectralDesc})`}
        </p>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: 12,
          color: 'rgba(232, 236, 245, 0.7)',
        }}
      >
        <div style={{ color: belowHorizon ? '#ff8a8a' : 'rgba(232, 236, 245, 0.7)' }}>
          Alt {altAz.altitudeDeg.toFixed(1)}&deg; / Az {altAz.azimuthDeg.toFixed(1)}&deg;
          {belowHorizon && ' — below horizon'}
        </div>

        {riseTransitSet.neverRises ? (
          <div style={{ marginTop: 4 }}>Never rises above the horizon today.</div>
        ) : riseTransitSet.circumpolar ? (
          <>
            <div style={{ marginTop: 4 }}>Circumpolar — never sets</div>
            <div>Transit {formatClock(riseTransitSet.transit)}</div>
          </>
        ) : (
          <>
            <div style={{ marginTop: 4 }}>Rise {formatClock(riseTransitSet.rise)}</div>
            <div>Transit {formatClock(riseTransitSet.transit)}</div>
            <div>Set {formatClock(riseTransitSet.set)}</div>
          </>
        )}
      </div>
    </div>
  );
}
