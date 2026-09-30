'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  SCALE_STOPS,
  SCALE_GROUP_SIZE,
  SCALE_GROUP_LABELS,
  backgroundColorForStop,
  placeholderImageUrl,
  stopIndexFromId,
} from '@/lib/scales';
import ScalesAboutPanel from '@/components/ScalesAboutPanel';

const STOP_COUNT = SCALE_STOPS.length;
const IMAGE_PRELOAD_RADIUS = 2;
// How much the image shrinks/fades at a full viewport-height's distance from
// center - a continuous function of scroll position, not a timed animation,
// so its "duration" is however long the browser's own scroll/snap takes.
const SCALE_SHRINK_RANGE = 0.35;
const OPACITY_FADE_RANGE = 0.55;
const URL_PARAM = 'stop';

export default function ScalesExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const imageWrapRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredTick, setHoveredTick] = useState<number | null>(null);
  const [brokenImageIndices, setBrokenImageIndices] = useState<ReadonlySet<number>>(new Set());
  const isMobile = useIsMobile();

  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // ?stop=<id> on mount - jump instantly (no animation) so a reload lands
  // exactly where it left off.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const index = stopIndexFromId(params.get(URL_PARAM));
    if (index === 0) return;
    setActiveIndex(index);
    const el = sectionRefs.current[index];
    el?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, []);

  // Keep the URL in sync without navigating or polluting browser history.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, SCALE_STOPS[activeIndex].id);
    window.history.replaceState(null, '', url);
  }, [activeIndex]);

  // Preload the next/previous 2 stop images so they don't pop in.
  useEffect(() => {
    for (let i = activeIndex - IMAGE_PRELOAD_RADIUS; i <= activeIndex + IMAGE_PRELOAD_RADIUS; i++) {
      if (i < 0 || i >= STOP_COUNT || i === activeIndex) continue;
      const img = new window.Image();
      img.src = placeholderImageUrl(SCALE_STOPS[i]);
    }
  }, [activeIndex]);

  // Scroll-position-driven zoom transition + "which stop is active" tracking.
  // Deliberately has no CSS transition and no timer on the transform itself -
  // it's recomputed from the live scroll offset every frame, so its pacing
  // is exactly the browser's own scroll/snap physics.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rafId = 0;
    let scheduled = false;

    function update() {
      scheduled = false;
      const viewportCenter = window.innerHeight / 2;
      let nearestIndex = 0;
      let nearestDist = Infinity;

      sectionRefs.current.forEach((section, i) => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }

        const wrap = imageWrapRefs.current[i];
        if (!wrap) return;
        const normalized = Math.min(1, dist / window.innerHeight);
        if (reducedMotion) {
          wrap.style.transform = 'none';
        } else {
          wrap.style.transform = `scale(${1 - normalized * SCALE_SHRINK_RANGE})`;
        }
        wrap.style.opacity = String(1 - normalized * OPACITY_FADE_RANGE);
      });

      setActiveIndex((prev) => (prev === nearestIndex ? prev : nearestIndex));
    }

    function onScrollOrResize() {
      if (!scheduled) {
        scheduled = true;
        rafId = requestAnimationFrame(update);
      }
    }

    update();
    container.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [reducedMotion]);

  const scrollToStop = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const clamped = Math.max(0, Math.min(STOP_COUNT - 1, index));
    sectionRefs.current[clamped]?.scrollIntoView({ behavior, block: 'start' });
  }, []);

  // Arrow keys move by 1 stop, page keys by 3, home/end jump to the ends.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      let targetIndex: number | null = null;
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          targetIndex = activeIndexRef.current + 1;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          targetIndex = activeIndexRef.current - 1;
          break;
        case 'PageDown':
          targetIndex = activeIndexRef.current + 3;
          break;
        case 'PageUp':
          targetIndex = activeIndexRef.current - 3;
          break;
        case 'Home':
          targetIndex = 0;
          break;
        case 'End':
          targetIndex = STOP_COUNT - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      setHasScrolled(true);
      scrollToStop(targetIndex);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToStop]);

  // First scroll/touch input fades the "Scroll to explore" hint for good.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function dismiss() {
      setHasScrolled(true);
    }
    container.addEventListener('wheel', dismiss, { passive: true, once: true });
    container.addEventListener('touchmove', dismiss, { passive: true, once: true });
    return () => {
      container.removeEventListener('wheel', dismiss);
      container.removeEventListener('touchmove', dismiss);
    };
  }, []);

  function handleTickClick(index: number) {
    setHasScrolled(true);
    scrollToStop(index);
  }

  function handleImageError(index: number) {
    setBrokenImageIndices((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  return (
    <div>
      <header className="scales-header">
        <div className="scales-header-title">Scales of Wonder</div>
        <div className="scales-header-position">
          {activeIndex + 1} / {STOP_COUNT}
        </div>
        <div className="scales-header-right">
          <Link href="/" className="scales-header-link">
            Sky
          </Link>
          <button
            onClick={() => setAboutOpen((v) => !v)}
            aria-label="About"
            className="scales-about-button"
          >
            &#9432;
          </button>
        </div>
      </header>

      <nav
        className={isMobile ? 'scales-rail scales-rail-horizontal' : 'scales-rail scales-rail-vertical'}
        aria-label="Scale stops"
      >
        {SCALE_STOPS.map((stop, i) => {
          const groupIndex = i / SCALE_GROUP_SIZE;
          const showGroupLabel = Number.isInteger(groupIndex);
          return (
            <div key={stop.id} className="scales-tick-group">
              {showGroupLabel && (
                <div className="scales-tick-label">{SCALE_GROUP_LABELS[groupIndex]}</div>
              )}
              <button
                onClick={() => handleTickClick(i)}
                onMouseEnter={() => setHoveredTick(i)}
                onMouseLeave={() => setHoveredTick((h) => (h === i ? null : h))}
                onFocus={() => setHoveredTick(i)}
                onBlur={() => setHoveredTick((h) => (h === i ? null : h))}
                aria-label={`Jump to ${stop.name}`}
                aria-current={i === activeIndex}
                className={`scales-tick${i === activeIndex ? ' scales-tick-active' : ''}`}
              >
                {hoveredTick === i && <span className="scales-tick-tooltip">{stop.name}</span>}
              </button>
            </div>
          );
        })}
      </nav>

      {!hasScrolled && <div className="scales-hint">Scroll to explore</div>}

      {aboutOpen && <ScalesAboutPanel onClose={() => setAboutOpen(false)} />}

      <div ref={containerRef} className="scales-scroll">
        {SCALE_STOPS.map((stop, i) => {
          const isBroken = brokenImageIndices.has(i);
          const src = isBroken ? placeholderImageUrl(stop) : stop.image ?? placeholderImageUrl(stop);
          return (
            <section
              key={stop.id}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              className="scales-stop"
              style={{ background: backgroundColorForStop(i) }}
            >
              <div className="scales-stop-inner">
                <div className="scales-image-col">
                  <div
                    ref={(el) => {
                      imageWrapRefs.current[i] = el;
                    }}
                    className="scales-image-wrap"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated per-stop placeholder, not a static asset */}
                    <img
                      src={src}
                      alt={stop.name}
                      className="scales-image"
                      onError={() => handleImageError(i)}
                    />
                  </div>
                  {isBroken && <div className="scales-image-missing">image missing</div>}
                </div>

                <div className="scales-text-col">
                  <div className="scales-scale-label">
                    10<sup>{stop.exponent}</sup> m
                  </div>
                  <h2 className="scales-name">{stop.name}</h2>
                  <p className="scales-fact">{stop.fact}</p>
                  {stop.quote && (
                    <div className="scales-quote-block">
                      <p className="scales-quote">&ldquo;{stop.quote}&rdquo;</p>
                      {stop.attribution && <div className="scales-attribution">{stop.attribution}</div>}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <style jsx>{`
        .scales-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(5, 6, 15, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-header-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 16px;
          color: #e8ecf5;
        }
        .scales-header-position {
          font-family: var(--font-geist-mono, monospace);
          font-size: 13px;
          color: rgba(232, 236, 245, 0.6);
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .scales-header-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .scales-header-link {
          font-size: 13px;
          color: rgba(232, 236, 245, 0.75);
          text-decoration: none;
        }
        .scales-header-link:hover {
          color: #e8ecf5;
        }
        .scales-about-button {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(232, 236, 245, 0.75);
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .scales-hint {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 25;
          font-size: 13px;
          color: rgba(232, 236, 245, 0.55);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
          animation: scales-pulse 2.2s ease-in-out infinite;
          transition: opacity 0.6s ease;
        }
        @keyframes scales-pulse {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.85;
          }
        }

        .scales-scroll {
          height: 100vh;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .scales-stop {
          height: 100vh;
          width: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .scales-stop-inner {
          width: 100%;
          max-width: 1400px;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 64px;
          gap: 48px;
          box-sizing: border-box;
        }
        .scales-image-col {
          width: 60%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .scales-image-wrap {
          display: inline-flex;
          will-change: transform, opacity;
        }
        .scales-image {
          display: block;
          max-width: 100%;
          max-height: 80vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 0 110px 36px rgba(0, 0, 0, 0.4);
        }
        .scales-image-missing {
          margin-top: 12px;
          font-size: 11px;
          color: rgba(232, 236, 245, 0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .scales-text-col {
          width: 40%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-scale-label {
          font-family: var(--font-geist-mono, monospace);
          font-size: 20px;
          color: rgba(232, 236, 245, 0.5);
          margin-bottom: 8px;
        }
        .scales-scale-label sup {
          font-size: 0.65em;
          vertical-align: super;
        }
        .scales-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 56px;
          color: #ffffff;
          margin: 0 0 20px 0;
          font-weight: 400;
          line-height: 1.05;
        }
        .scales-fact {
          font-size: 18px;
          color: #c8ccd6;
          max-width: 40ch;
          line-height: 1.55;
          margin: 0;
        }
        .scales-quote-block {
          margin-top: 28px;
          padding-left: 20px;
          border-left: 2px solid rgba(232, 236, 245, 0.2);
        }
        .scales-quote {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          color: #e8ecf5;
          margin: 0;
          line-height: 1.4;
        }
        .scales-attribution {
          margin-top: 8px;
          font-size: 13px;
          color: rgba(232, 236, 245, 0.5);
        }

        .scales-rail {
          position: fixed;
          z-index: 20;
        }
        .scales-rail-vertical {
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }
        .scales-rail-horizontal {
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px 16px;
          background: rgba(5, 6, 15, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          overflow-x: auto;
        }
        .scales-tick-group {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .scales-rail-horizontal .scales-tick-group {
          flex-direction: row;
          align-items: center;
        }
        .scales-tick-label {
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(232, 236, 245, 0.4);
          margin-bottom: 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scales-rail-horizontal .scales-tick-label {
          margin-bottom: 0;
          margin-right: 4px;
        }
        .scales-tick {
          position: relative;
          width: 16px;
          height: 2px;
          border: none;
          padding: 0;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.2);
        }
        .scales-tick-active {
          width: 22px;
          background: #e8ecf5;
        }
        .scales-rail-horizontal .scales-tick {
          width: 2px;
          height: 14px;
        }
        .scales-rail-horizontal .scales-tick-active {
          height: 20px;
        }
        .scales-tick-tooltip {
          position: absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          background: rgba(5, 6, 15, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e8ecf5;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 3px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
        }
        .scales-rail-horizontal .scales-tick-tooltip {
          right: auto;
          left: 50%;
          top: auto;
          bottom: calc(100% + 8px);
          transform: translateX(-50%);
        }

        @media (max-width: 600px) {
          .scales-stop-inner {
            flex-direction: column;
            padding: 90px 24px 100px;
            gap: 20px;
            justify-content: center;
          }
          .scales-image-col,
          .scales-text-col {
            width: 100%;
          }
          .scales-image {
            max-height: 42vh;
          }
          .scales-name {
            font-size: 34px;
          }
          .scales-fact {
            font-size: 15px;
            max-width: none;
          }
          .scales-header-position {
            display: none;
          }
          .scales-hint {
            bottom: 76px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scales-hint {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
