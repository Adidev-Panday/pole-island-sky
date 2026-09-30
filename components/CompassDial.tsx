'use client';

import { useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CompassDialProps {
  rotationDeg: number;
  onChange: (rotationDeg: number) => void;
}

const DIAL_SIZE_DESKTOP_PX = 60;
const DIAL_SIZE_MOBILE_PX = 48;
const SNAP_THRESHOLD_DEG = 3;
const TICKS: Array<[string, number]> = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
];

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export default function CompassDial({ rotationDeg, onChange }: CompassDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const dialSize = isMobile ? DIAL_SIZE_MOBILE_PX : DIAL_SIZE_DESKTOP_PX;
  const dialRadius = dialSize / 2;

  const angleFromEvent = useCallback((clientX: number, clientY: number): number | null => {
    const dial = dialRef.current;
    if (!dial) return null;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 with (dx, -dy) so 0deg is up (north) and angle increases clockwise.
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    deg = normalizeDeg(deg);
    if (deg <= SNAP_THRESHOLD_DEG || deg >= 360 - SNAP_THRESHOLD_DEG) deg = 0;
    return deg;
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    const deg = angleFromEvent(e.clientX, e.clientY);
    if (deg !== null) onChange(deg);

    function handleMove(ev: PointerEvent) {
      const d = angleFromEvent(ev.clientX, ev.clientY);
      if (d !== null) onChange(d);
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const pointerAngleRad = (rotationDeg * Math.PI) / 180;
  const pointerX = dialRadius + (dialRadius - 8) * Math.sin(pointerAngleRad);
  const pointerY = dialRadius - (dialRadius - 8) * Math.cos(pointerAngleRad);

  return (
    <div
      style={{
        position: 'fixed',
        // Mobile's bottom strip stacks into several rows (~200px) instead of
        // one (~90px on desktop), so the dial needs to clear a lot more of it.
        bottom: isMobile ? 180 : 96,
        left: isMobile ? 16 : undefined,
        right: isMobile ? undefined : 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        style={{
          position: 'relative',
          width: dialSize,
          height: dialSize,
          borderRadius: '50%',
          background: 'rgba(8, 10, 20, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          cursor: 'grab',
          touchAction: 'none',
        }}
        aria-label="Sky rotation compass"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={rotationDeg}
      >
        {TICKS.map(([label, deg]) => {
          const rad = (deg * Math.PI) / 180;
          const tx = dialRadius + (dialRadius - 10) * Math.sin(rad);
          const ty = dialRadius - (dialRadius - 10) * Math.cos(rad);
          return (
            <span
              key={label}
              style={{
                position: 'absolute',
                left: tx,
                top: ty,
                transform: 'translate(-50%, -50%)',
                fontSize: 9,
                color: 'rgba(232, 236, 245, 0.5)',
                pointerEvents: 'none',
              }}
            >
              {label}
            </span>
          );
        })}

        <svg
          width={dialSize}
          height={dialSize}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <line
            x1={dialRadius}
            y1={dialRadius}
            x2={pointerX}
            y2={pointerY}
            stroke="#e8ecf5"
            strokeWidth={1.5}
          />
          <circle cx={pointerX} cy={pointerY} r={3} fill="#e8ecf5" />
        </svg>
      </div>
      <button
        onClick={() => onChange(0)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(232, 236, 245, 0.6)',
          fontSize: 11,
          cursor: 'pointer',
          padding: 2,
        }}
      >
        Reset
      </button>
    </div>
  );
}
