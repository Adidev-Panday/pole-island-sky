'use client';

import {
  compareImageHeights,
  placeholderImageUrl,
  scaleMetersForStop,
  formatRatio,
  type ScaleStop,
} from '@/lib/scales';

interface ScalesCompareViewProps {
  stopA: ScaleStop;
  stopB: ScaleStop;
  onClose: () => void;
}

export default function ScalesCompareView({ stopA, stopB, onClose }: ScalesCompareViewProps) {
  const { heightA, heightB } = compareImageHeights(stopA, stopB);
  const metersA = scaleMetersForStop(stopA);
  const metersB = scaleMetersForStop(stopB);
  const bigger = metersA >= metersB ? stopA : stopB;
  const smaller = metersA >= metersB ? stopB : stopA;
  const ratio = formatRatio(Math.max(metersA, metersB) / Math.min(metersA, metersB));

  return (
    <div className="scales-compare-view">
      <button onClick={onClose} className="scales-compare-close" aria-label="Exit compare mode">
        &times; Close
      </button>

      <div className="scales-compare-panes">
        <CompareStopPane stop={stopA} heightPx={heightA} />
        <div className="scales-compare-ratio">
          <p>
            The <strong>{bigger.name}</strong> is{' '}
            <strong>
              {ratio.kind === 'plain' ? (
                ratio.text
              ) : (
                <>
                  {ratio.mantissa} &times; 10<sup>{ratio.exponent}</sup>
                </>
              )}
            </strong>{' '}
            times larger than the <strong>{smaller.name}</strong>.
          </p>
        </div>
        <CompareStopPane stop={stopB} heightPx={heightB} />
      </div>

      <style jsx>{`
        .scales-compare-view {
          position: fixed;
          inset: 0;
          z-index: 35;
          background: #05060f;
          display: flex;
          flex-direction: column;
        }
        .scales-compare-close {
          position: absolute;
          top: 16px;
          left: 24px;
          z-index: 2;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: #e8ecf5;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 4px;
          padding: 7px 14px;
          cursor: pointer;
        }
        .scales-compare-close:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .scales-compare-panes {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .scales-compare-ratio {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px 24px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .scales-compare-ratio p {
          margin: 0;
          max-width: 60ch;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 19px;
          color: #e8ecf5;
          line-height: 1.5;
        }
        .scales-compare-ratio sup {
          font-size: 0.7em;
          vertical-align: super;
        }

        @media (max-width: 600px) and (orientation: landscape) {
          .scales-compare-panes {
            flex-direction: row;
          }
          .scales-compare-ratio {
            border-top: none;
            border-bottom: none;
            border-left: 1px solid rgba(255, 255, 255, 0.08);
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}

function CompareStopPane({ stop, heightPx }: { stop: ScaleStop; heightPx: number }) {
  const src = stop.image ?? placeholderImageUrl(stop);
  return (
    <div className="scales-compare-pane">
      {/* eslint-disable-next-line @next/next/no-img-element -- per-stop placeholder image, not a static asset */}
      <img src={src} alt={stop.name} style={{ height: heightPx, width: 'auto' }} className="scales-compare-image" />
      <div className="scales-compare-caption">
        <div className="scales-compare-scale">
          10<sup>{stop.exponent}</sup> m
        </div>
        <div className="scales-compare-name">{stop.name}</div>
      </div>

      <style jsx>{`
        .scales-compare-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 0;
          padding: 24px;
        }
        .scales-compare-image {
          display: block;
          max-width: 90%;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 0 90px 30px rgba(0, 0, 0, 0.4);
        }
        .scales-compare-caption {
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-compare-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 24px;
          color: #ffffff;
        }
        .scales-compare-scale {
          font-family: var(--font-geist-mono, monospace);
          font-size: 12px;
          color: rgba(232, 236, 245, 0.5);
          margin-bottom: 2px;
        }
        .scales-compare-scale sup {
          font-size: 0.75em;
          vertical-align: super;
        }
      `}</style>
    </div>
  );
}
