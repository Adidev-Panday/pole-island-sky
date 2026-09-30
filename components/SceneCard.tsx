'use client';

import { CARD_FADE_MS } from '@/hooks/useSceneController';
import { useIsMobile } from '@/hooks/useIsMobile';

interface SceneCardProps {
  visible: boolean;
  faded: boolean;
  line3Visible: boolean;
  onDismiss: () => void;
}

export default function SceneCard({ visible, faded, line3Visible, onDismiss }: SceneCardProps) {
  const isMobile = useIsMobile();
  if (!visible) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 19,
          background: '#000',
          opacity: faded ? 0 : 1,
          transition: `opacity ${CARD_FADE_MS}ms ease`,
          pointerEvents: 'none',
        }}
      />
      <div
        onClick={faded ? onDismiss : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
          opacity: faded ? 0.08 : 1,
          transition: `opacity ${CARD_FADE_MS}ms ease`,
          cursor: faded ? 'pointer' : 'default',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 11 : 13,
            color: 'rgba(232, 236, 245, 0.6)',
            marginBottom: isMobile ? 10 : 14,
          }}
        >
          Casco Bay, Maine
        </div>
        <div
          style={{
            fontSize: isMobile ? 22 : 32,
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#e8ecf5',
            marginBottom: isMobile ? 16 : 22,
          }}
        >
          1:30 in the morning, mid-August
        </div>
        <div
          style={{
            fontSize: isMobile ? 12 : 14,
            color: 'rgba(232, 236, 245, 0.6)',
            maxWidth: 480,
            lineHeight: 1.6,
            opacity: line3Visible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          You are lying in a small motorboat, drifting toward your dock. The sky
          vibrates with stars.
        </div>
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: 0,
            right: 0,
            fontSize: isMobile ? 10 : 11,
            color: 'rgba(232, 236, 245, 0.4)',
            padding: '0 24px',
          }}
        >
          After Alan Lightman, <em>Searching for Stars on an Island in Maine</em> (2018)
        </div>
      </div>
    </>
  );
}
