'use client';

import { useEffect, useRef } from 'react';

interface AboutPanelProps {
  onClose: () => void;
}

const BOOK_URL =
  'https://www.penguinrandomhouse.com/books/550397/searching-for-stars-on-an-island-in-maine-by-alan-lightman/';

export default function AboutPanel({ onClose }: AboutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Register after the opening click has already finished dispatching,
    // so the same click that opened the panel doesn't immediately close it.
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
        maxWidth: 420,
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
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Stars In Maine</h2>
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
        A recreation of the night sky Dr. Alan Lightman describes from his island in
        Casco Bay, Maine, in his book <em>Searching for Stars on an Island in Maine</em>{' '}
        (2018). Along with basically every other night sky past and present, including
        your birthday, from the island from Casco.
      </p>

      <p style={{ color: 'rgba(232, 236, 245, 0.5)', fontSize: 11, marginBottom: 4 }}>
        Credits: astronomy-engine (MIT) &middot; HYG database v4.1, Astronexus &amp; David
        Nash (CC BY-SA 4.0) &middot; Stellarium constellation figures (GPL-2, data
        table) &middot; d3-celestial Milky Way outline, Olaf Frohn (BSD-3). Redistributed
        data files keep their upstream licenses; see{' '}
        <code style={{ fontSize: 10 }}>LICENSES/</code> in the repo.
      </p>

      <p style={{ fontSize: 12 }}>
        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#9db8ff' }}
        >
          Read The Book
        </a>
      </p>

      <p style={{ color: 'rgba(232, 236, 245, 0.4)', fontSize: 11, marginBottom: 0 }}>
        Made by Adidev Panday using Claude Code, 2026
      </p>
    </div>
  );
}
