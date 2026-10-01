'use client';

import { useState } from 'react';
import type { ScaleStop } from '@/lib/scales';

interface ScalesContentPanelProps {
  stop: ScaleStop;
  isMobile: boolean;
}

export default function ScalesContentPanel({ stop, isMobile }: ScalesContentPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      key={stop.id}
      className={`scales-panel${isMobile ? ' scales-panel-mobile' : ''}`}
      onClick={() => isMobile && setExpanded((v) => !v)}
      role={isMobile ? 'button' : undefined}
      aria-expanded={isMobile ? expanded : undefined}
      aria-label={isMobile ? `${stop.name}, tap to ${expanded ? 'collapse' : 'expand'}` : undefined}
    >
      <div className="scales-panel-scale">
        10<sup>{stop.exponent}</sup> m
      </div>
      <h2 className="scales-panel-name">{stop.name}</h2>
      {(!isMobile || expanded) && (
        <>
          <p className="scales-panel-fact">{stop.fact}</p>
          {stop.imageCredit && <p className="scales-panel-credit">Image: {stop.imageCredit}</p>}
          {stop.quote && (
            <div className="scales-panel-quote-block">
              <p className="scales-panel-quote">&ldquo;{stop.quote}&rdquo;</p>
              {stop.attribution && <div className="scales-panel-attribution">{stop.attribution}</div>}
            </div>
          )}
        </>
      )}
      {isMobile && !expanded && <p className="scales-panel-fact scales-panel-fact-clipped">{stop.fact}</p>}

      <style jsx>{`
        .scales-panel {
          position: fixed;
          top: 72px;
          left: 24px;
          z-index: 20;
          max-width: 36ch;
          animation: scales-panel-fade 0.3s ease;
          pointer-events: none;
        }
        .scales-panel::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: min(620px, 80vw);
          height: 100vh;
          background: linear-gradient(
            115deg,
            rgba(5, 6, 15, 0.82) 0%,
            rgba(5, 6, 15, 0.55) 48%,
            rgba(5, 6, 15, 0) 78%
          );
          z-index: -1;
        }
        .scales-panel-scale {
          font-family: var(--font-geist-mono, monospace);
          font-size: 18px;
          color: rgba(232, 236, 245, 0.55);
          margin-bottom: 6px;
        }
        .scales-panel-scale sup {
          font-size: 0.65em;
          vertical-align: super;
        }
        .scales-panel-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 48px;
          color: #ffffff;
          margin: 0 0 14px 0;
          font-weight: 400;
          line-height: 1.05;
        }
        .scales-panel-fact {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          color: #c8ccd6;
          max-width: 36ch;
          line-height: 1.5;
          margin: 0;
        }
        .scales-panel-credit {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin: 8px 0 0 0;
        }
        .scales-panel-quote-block {
          margin-top: 20px;
          padding-left: 18px;
          border-left: 2px solid rgba(232, 236, 245, 0.2);
        }
        .scales-panel-quote {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 18px;
          color: #e8ecf5;
          margin: 0;
          line-height: 1.4;
        }
        .scales-panel-attribution {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(232, 236, 245, 0.5);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @keyframes scales-panel-fade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .scales-panel-mobile::before {
          display: none;
        }
        .scales-panel-mobile {
          pointer-events: auto;
          cursor: pointer;
          top: auto;
          bottom: 72px;
          left: 16px;
          right: 16px;
          max-width: none;
          background: rgba(5, 6, 15, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 14px 16px;
        }
        .scales-panel-mobile .scales-panel-name {
          font-size: 24px;
          margin-bottom: 4px;
        }
        .scales-panel-mobile .scales-panel-scale {
          font-size: 13px;
          margin-bottom: 2px;
        }
        .scales-panel-mobile .scales-panel-fact {
          font-size: 13px;
        }
        .scales-panel-fact-clipped {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .scales-panel {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
