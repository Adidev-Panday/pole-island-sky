'use client';

import { useState } from 'react';
import AboutPanel from '@/components/AboutPanel';
import { useIsMobile } from '@/hooks/useIsMobile';

interface TopRightControlsProps {
  labelsEnabled: boolean;
  onToggleLabels: (enabled: boolean) => void;
}

const ICON_BUTTON_SIZE_PX = 32;
const SIZE_OF_LIFE_URL = 'https://neal.fun/size-of-life/';

export default function TopRightControls({ labelsEnabled, onToggleLabels }: TopRightControlsProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 12,
          color: 'rgba(232, 236, 245, 0.75)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 10,
          }}
        >
          {isMobile ? (
            <button
              onClick={() => onToggleLabels(!labelsEnabled)}
              aria-label="Toggle labels"
              aria-pressed={labelsEnabled}
              style={{
                width: ICON_BUTTON_SIZE_PX,
                height: ICON_BUTTON_SIZE_PX,
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: labelsEnabled ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                color: 'rgba(232, 236, 245, 0.9)',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              L
            </button>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={labelsEnabled}
                onChange={(e) => onToggleLabels(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Labels
            </label>
          )}

          <button
            onClick={() => setAboutOpen((v) => !v)}
            aria-label="About"
            style={{
              width: isMobile ? ICON_BUTTON_SIZE_PX : 20,
              height: isMobile ? ICON_BUTTON_SIZE_PX : 20,
              borderRadius: isMobile ? 4 : '50%',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'rgba(232, 236, 245, 0.75)',
              fontSize: isMobile ? 16 : 12,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            &#9432;
          </button>
        </div>

        <a
          href={SIZE_OF_LIFE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: 90,
            height: 28,
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.14)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'rgba(232, 236, 245, 0.75)',
            fontSize: 12,
            textDecoration: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          Size of Life
        </a>
      </div>

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
    </>
  );
}
