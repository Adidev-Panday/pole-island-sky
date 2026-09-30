'use client';

import { useState } from 'react';
import AboutPanel from '@/components/AboutPanel';

interface TopRightControlsProps {
  labelsEnabled: boolean;
  onToggleLabels: (enabled: boolean) => void;
}

export default function TopRightControls({ labelsEnabled, onToggleLabels }: TopRightControlsProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 12,
          color: 'rgba(232, 236, 245, 0.75)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={labelsEnabled}
            onChange={(e) => onToggleLabels(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Labels
        </label>

        <button
          onClick={() => setAboutOpen((v) => !v)}
          aria-label="About"
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'rgba(232, 236, 245, 0.75)',
            fontSize: 12,
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

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
    </>
  );
}
