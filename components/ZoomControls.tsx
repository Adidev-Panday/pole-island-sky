'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { DIAL_SIZE_DESKTOP_PX, DIAL_SIZE_MOBILE_PX } from '@/components/CompassDial';
import { ZOOM_MIN, ZOOM_MAX } from '@/lib/projection';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const BUTTON_SIZE_PX = 32;
const COMPASS_GAP_PX = 12;

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const isMobile = useIsMobile();
  const dialSize = isMobile ? DIAL_SIZE_MOBILE_PX : DIAL_SIZE_DESKTOP_PX;
  const sideOffsetPx = 16 + dialSize + COMPASS_GAP_PX;

  const buttonStyle: React.CSSProperties = {
    width: BUTTON_SIZE_PX,
    height: BUTTON_SIZE_PX,
    borderRadius: 4,
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(232, 236, 245, 0.9)',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 180 : 96,
        left: isMobile ? sideOffsetPx : undefined,
        right: isMobile ? undefined : sideOffsetPx,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <button onClick={onZoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" style={buttonStyle}>
        +
      </button>
      <div
        style={{
          fontSize: 11,
          color: 'rgba(232, 236, 245, 0.6)',
          minWidth: BUTTON_SIZE_PX,
          textAlign: 'center',
        }}
      >
        {zoom.toFixed(1)}x
      </div>
      <button onClick={onZoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" style={buttonStyle}>
        &minus;
      </button>
      <button
        onClick={onReset}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(232, 236, 245, 0.6)',
          fontSize: 11,
          cursor: 'pointer',
          padding: 2,
        }}
      >
        1x
      </button>
    </div>
  );
}
