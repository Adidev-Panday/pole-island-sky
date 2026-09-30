'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface ScalesAboutPanelProps {
  onClose: () => void;
}

export default function ScalesAboutPanel({ onClose }: ScalesAboutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const id = window.setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 48,
        right: 16,
        zIndex: 20,
        width: '90vw',
        maxWidth: 380,
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
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Scales of Wonder</h2>
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

      <p style={{ marginTop: 12, color: 'rgba(232, 236, 245, 0.85)' }}>
        A powers-of-ten journey from the Planck length to the observable universe, in the spirit
        of Alan Lightman&apos;s <em>Searching for Stars on an Island in Maine</em> (2018).
      </p>

      <p style={{ color: 'rgba(232, 236, 245, 0.5)', fontSize: 11, marginBottom: 4 }}>
        Images shown here are placeholders pending real photography for each scale.
      </p>

      <p style={{ fontSize: 12, marginBottom: 0 }}>
        <Link href="/" style={{ color: '#9db8ff' }}>
          &larr; Back to Pole Island Sky
        </Link>
      </p>
    </div>
  );
}
