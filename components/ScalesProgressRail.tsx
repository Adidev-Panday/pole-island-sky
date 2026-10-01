'use client';

import { SCALE_GROUP_LABELS, type ScaleStop } from '@/lib/scales';

interface ScalesProgressRailProps {
  stops: ScaleStop[];
  dominantIndex: number;
  onJump: (index: number) => void;
}

export default function ScalesProgressRail({ stops, dominantIndex, onJump }: ScalesProgressRailProps) {
  return (
    <nav className="scales-rail" aria-label="Scale stops">
      <div className="scales-rail-ticks">
        {stops.map((stop, i) => (
          <button
            key={stop.id}
            onClick={() => onJump(i)}
            aria-label={`Jump to ${stop.name}`}
            aria-current={i === dominantIndex}
            className={`scales-rail-tick${i === dominantIndex ? ' scales-rail-tick-active' : ''}`}
          />
        ))}
      </div>
      <div className="scales-rail-labels">
        {SCALE_GROUP_LABELS.map((label) => (
          <span key={label} className="scales-rail-label">
            {label}
          </span>
        ))}
      </div>

      <style jsx>{`
        .scales-rail {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 20;
          padding: 10px 24px 14px;
          background: rgba(5, 6, 15, 0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-rail-ticks {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 16px;
        }
        .scales-rail-ticks::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
        }
        .scales-rail-tick {
          position: relative;
          width: 2px;
          height: 10px;
          border: none;
          padding: 0;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.25);
          transition: background 0.2s ease, height 0.2s ease;
        }
        .scales-rail-tick:hover {
          background: rgba(255, 255, 255, 0.6);
        }
        .scales-rail-tick-active {
          height: 16px;
          background: #e8ecf5;
        }
        .scales-rail-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .scales-rail-label {
          flex: 1;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(232, 236, 245, 0.4);
          text-align: center;
        }
        .scales-rail-label:first-child {
          text-align: left;
        }
        .scales-rail-label:last-child {
          text-align: right;
        }

        @media (max-width: 600px) {
          .scales-rail {
            padding: 8px 12px 10px;
          }
          .scales-rail-label {
            font-size: 9px;
          }
        }
      `}</style>
    </nav>
  );
}
