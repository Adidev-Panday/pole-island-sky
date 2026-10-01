'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScaleStop } from '@/lib/scales';

interface ScalesComparePickerProps {
  stops: ScaleStop[];
  anchorStopId: string;
  onSelect: (stopId: string) => void;
  fullScreen: boolean;
}

export default function ScalesComparePicker({
  stops,
  anchorStopId,
  onSelect,
  fullScreen,
}: ScalesComparePickerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    const id = window.setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="scales-compare-wrap">
      <button
        onClick={() => setOpen((v) => !v)}
        className="scales-compare-button"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        Compare to&hellip;
      </button>

      {open &&
        (() => {
          const dropdown = (
            <div
              ref={panelRef}
              className={`scales-compare-dropdown${fullScreen ? ' scales-compare-dropdown-full' : ''}`}
              role="listbox"
            >
              {fullScreen && (
                <button onClick={() => setOpen(false)} className="scales-compare-dropdown-close" aria-label="Close">
                  &times;
                </button>
              )}
              {stops.map((stop) => (
                <button
                  key={stop.id}
                  role="option"
                  aria-selected={stop.id === anchorStopId}
                  disabled={stop.id === anchorStopId}
                  onClick={() => {
                    setOpen(false);
                    onSelect(stop.id);
                  }}
                  className="scales-compare-option"
                >
                  <span className="scales-compare-option-name">{stop.name}</span>
                  <span className="scales-compare-option-scale">
                    10<sup>{stop.exponent}</sup> m
                  </span>
                </button>
              ))}
            </div>
          );
          // backdrop-filter on an ancestor (the header) establishes a new
          // containing block for position:fixed, which would make the
          // full-screen variant's inset:0 resolve against the header's own
          // small box instead of the viewport - portal it to <body> instead.
          return fullScreen ? createPortal(dropdown, document.body) : dropdown;
        })()}

      <style jsx>{`
        .scales-compare-wrap {
          position: relative;
        }
        .scales-compare-button {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: #e8ecf5;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 4px;
          padding: 7px 14px;
          cursor: pointer;
        }
        .scales-compare-button:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .scales-compare-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 40;
          width: 280px;
          max-height: 340px;
          overflow-y: auto;
          background: rgba(8, 10, 20, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .scales-compare-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
          background: none;
          border: none;
          border-radius: 4px;
          padding: 9px 10px;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-compare-option:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }
        .scales-compare-option:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .scales-compare-option-name {
          font-size: 14px;
          color: #e8ecf5;
        }
        .scales-compare-option-scale {
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px;
          color: rgba(232, 236, 245, 0.5);
          white-space: nowrap;
        }
        .scales-compare-option-scale sup {
          font-size: 0.75em;
          vertical-align: super;
        }
        .scales-compare-dropdown-close {
          display: none;
        }

        @media (max-width: 600px) {
          .scales-compare-dropdown-full {
            position: fixed;
            inset: 0;
            width: auto;
            max-height: none;
            border-radius: 0;
            padding: 20px 16px;
            padding-top: calc(env(safe-area-inset-top, 0px) + 20px);
          }
          .scales-compare-dropdown-full .scales-compare-dropdown-close {
            display: block;
            align-self: flex-end;
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            color: #e8ecf5;
            font-size: 18px;
            cursor: pointer;
            margin-bottom: 12px;
          }
          .scales-compare-dropdown-full .scales-compare-option {
            padding: 14px 12px;
          }
          .scales-compare-dropdown-full .scales-compare-option-name {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
