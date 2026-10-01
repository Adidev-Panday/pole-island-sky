'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface ScalesAboutPanelProps {
  onClose: () => void;
}

interface CreditEntry {
  name: string;
  credit: string;
  url?: string;
}

interface CreditGroup {
  label: string;
  entries: CreditEntry[];
}

const CREDIT_GROUPS: CreditGroup[] = [
  {
    label: 'Public domain',
    entries: [
      { name: 'Planck length', credit: 'NASA/CXC/M. Weiss' },
      { name: 'Rhinovirus', credit: 'CDC Public Health Image Library' },
      { name: 'Ant', credit: 'USDA' },
      { name: 'Human being', credit: 'NASA Pioneer plaque' },
      { name: 'Blue whale', credit: 'NOAA Photo Library' },
      { name: 'Earth', credit: 'NASA Apollo 17' },
      { name: 'Sun', credit: 'NASA/SDO' },
      { name: 'Solar System', credit: 'NASA' },
      { name: 'Proxima Centauri', credit: 'ESA/Hubble & NASA' },
    ],
  },
  {
    label: 'CC BY',
    entries: [{ name: 'Milky Way', credit: 'ESO/Y. Beletsky' }],
  },
  {
    label: 'CC BY-SA',
    entries: [
      {
        name: 'Proton',
        credit: 'Arpad Horvath',
        url: 'https://commons.wikimedia.org/wiki/File:Proton_quark_structure.svg',
      },
      {
        name: 'Hydrogen atom',
        credit: 'PoorLeno',
        url: 'https://commons.wikimedia.org/wiki/File:Hydrogen_Density_Plots.png',
      },
      {
        name: 'DNA helix',
        credit: 'Zephyris',
        url: 'https://commons.wikimedia.org/wiki/File:DNA_Structure%2BKey%2BLabelled.pn_NoBB.png',
      },
      {
        name: 'Amoeba',
        credit: 'Patrick J. Lynch',
        url: 'https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg',
      },
      {
        name: 'Human hair',
        credit: 'Jan Homann',
        url: 'https://commons.wikimedia.org/wiki/File:Haar_Follikel.jpg',
      },
      {
        name: 'Mount Everest',
        credit: 'shrimpo1967',
        url: 'https://commons.wikimedia.org/wiki/File:Everest_kalapatthar.jpg',
      },
      {
        name: 'Local Group',
        credit: 'Antonio Ciccolella',
        url: 'https://commons.wikimedia.org/wiki/File:Local_Group_(labeled).jpg',
      },
      {
        name: 'Observable Universe',
        credit: 'Pablo Carlos Budassi',
        url: 'https://commons.wikimedia.org/wiki/File:Observable_Universe_with_Measurements_01.png',
      },
    ],
  },
];

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
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto',
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
        A horizontal journey through 61 orders of magnitude, from the Planck length to the
        observable universe, in the spirit of Alan Lightman&apos;s{' '}
        <em>Searching for Stars on an Island in Maine</em> (2018). Scroll, drag, or press space to
        travel the ruler - every image is drawn true to its relative size. Use &ldquo;Compare
        to&hellip;&rdquo; to put any two stops side by side.
      </p>

      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          margin: '18px 0 8px 0',
          color: 'rgba(232, 236, 245, 0.7)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Images
      </h3>

      {CREDIT_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(232, 236, 245, 0.45)', marginBottom: 4 }}>{group.label}</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {group.entries.map((entry) => (
              <li key={entry.name} style={{ fontSize: 12, color: 'rgba(232, 236, 245, 0.75)' }}>
                {entry.name} &mdash;{' '}
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: '#9db8ff' }}>
                    {entry.credit}
                  </a>
                ) : (
                  entry.credit
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p style={{ fontSize: 12, marginBottom: 0, marginTop: 16 }}>
        <Link href="/" style={{ color: '#9db8ff' }}>
          &larr; Back to Pole Island Sky
        </Link>
      </p>
    </div>
  );
}
