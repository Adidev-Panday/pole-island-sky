'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  SCALE_STOPS,
  buildScaleLayout,
  buildGridlines,
  localTicks,
  dominantIndexForX,
  mppAtX,
  imageHeightAtMpp,
  scaleLabelPlainText,
  placeholderImageUrl,
  stopIndexFromId,
  backgroundGradientForTrack,
  parseCompareParam,
  compareParamForIds,
  HUMAN_HEIGHT_METERS,
  HUMAN_DOT_THRESHOLD_PX,
  type GridlineInfo,
} from '@/lib/scales';
import ScalesContentPanel from '@/components/ScalesContentPanel';
import ScalesProgressRail from '@/components/ScalesProgressRail';
import ScalesComparePicker from '@/components/ScalesComparePicker';
import ScalesCompareView from '@/components/ScalesCompareView';
import ScalesAboutPanel from '@/components/ScalesAboutPanel';

const STOP_COUNT = SCALE_STOPS.length;
const IMAGE_MIN_PX = 2;
// A flat 8000px cap let every off-dominant stop (often many orders of
// magnitude away from the current calibration) balloon to the same huge box
// and pile up across the whole viewport. Capping relative to viewport height
// instead means a wildly-off-scale stop still fills/exceeds the screen (the
// "we're inside it now" effect is preserved) without smearing into neighbors.
const IMAGE_MAX_HEIGHT_VIEWPORT_FACTOR = 1.4;
const AUTOPLAY_SPEED_PX_PER_SEC = 220;
const AUTOPLAY_PAUSE_MS = 900;
const AUTOPLAY_PAUSE_EPSILON_PX = 4;
const STOP_PARAM = 'stop';
const COMPARE_PARAM = 'compare';
const HUMAN_SILHOUETTE_ASPECT = 0.29;

export default function ScalesExperience() {
  const layout = useMemo(() => buildScaleLayout(SCALE_STOPS), []);
  const gridlines = useMemo(() => buildGridlines(layout), [layout]);
  const isMobile = useIsMobile();

  const scrollRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const humanRef = useRef<HTMLDivElement>(null);
  const humanCaptionRef = useRef<HTMLDivElement>(null);

  const [dominantIndex, setDominantIndex] = useState(0);
  const [ticks, setTicks] = useState<GridlineInfo[]>([]);
  const [compareIndices, setCompareIndices] = useState<[number, number] | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [brokenImageIndices, setBrokenImageIndices] = useState<ReadonlySet<number>>(new Set());

  const dominantIndexRef = useRef(dominantIndex);
  useEffect(() => {
    dominantIndexRef.current = dominantIndex;
  }, [dominantIndex]);

  const compareIndicesRef = useRef(compareIndices);
  useEffect(() => {
    compareIndicesRef.current = compareIndices;
  }, [compareIndices]);

  const anchorIndexRef = useRef(0);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const autoplayStateRef = useRef({ active: false, pausedUntil: 0, lastPausedIndex: -1, lastTs: 0 });

  // Consumes a pending jump queued while compare mode was closing (the
  // scroll container unmounts during compare mode, so we can't scroll it
  // until it's back in the DOM on the next render).
  useEffect(() => {
    if (compareIndices) return;
    if (pendingScrollIndexRef.current === null) return;
    const target = pendingScrollIndexRef.current;
    pendingScrollIndexRef.current = null;
    scrollRef.current?.scrollTo({ left: layout.xs[Math.max(0, Math.min(STOP_COUNT - 1, target))], behavior: 'auto' });
    setDominantIndex(Math.max(0, Math.min(STOP_COUNT - 1, target)));
  }, [compareIndices, layout]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const clamped = Math.max(0, Math.min(STOP_COUNT - 1, index));
      scrollRef.current?.scrollTo({
        left: layout.xs[clamped],
        behavior: reducedMotion ? 'auto' : behavior,
      });
    },
    [layout, reducedMotion]
  );

  // ?stop=<id> / ?compare=<id1>,<id2> on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compare = parseCompareParam(params.get(COMPARE_PARAM));
    if (compare) {
      anchorIndexRef.current = compare[0];
      setCompareIndices(compare);
      setDominantIndex(compare[0]);
      scrollToIndex(compare[0], 'auto');
      return;
    }
    const index = stopIndexFromId(params.get(STOP_PARAM));
    setDominantIndex(index);
    scrollToIndex(index, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync without navigating or polluting browser history.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (compareIndices) {
      url.searchParams.set(
        COMPARE_PARAM,
        compareParamForIds(SCALE_STOPS[compareIndices[0]].id, SCALE_STOPS[compareIndices[1]].id)
      );
      url.searchParams.delete(STOP_PARAM);
    } else {
      url.searchParams.set(STOP_PARAM, SCALE_STOPS[dominantIndex].id);
      url.searchParams.delete(COMPARE_PARAM);
    }
    window.history.replaceState(null, '', url);
  }, [dominantIndex, compareIndices]);

  const stopAutoplay = useCallback(() => {
    setAutoplay(false);
  }, []);

  useEffect(() => {
    autoplayStateRef.current.active = autoplay;
    if (autoplay) autoplayStateRef.current.lastPausedIndex = -1;
  }, [autoplay]);

  // Main per-frame loop: drives autoplay, recomputes the dominant stop and
  // the ruler's meters-per-pixel from the live scroll position, and
  // imperatively sizes every image + the human silhouette - no CSS
  // transition, no timer: its pacing is exactly scroll/rAF physics.
  useEffect(() => {
    if (compareIndices) return;
    const el = scrollRef.current;
    if (!el) return;
    let rafId = 0;

    function frame(ts: number) {
      const state = autoplayStateRef.current;
      if (state.active && el) {
        if (ts >= state.pausedUntil) {
          const dt = state.lastTs ? (ts - state.lastTs) / 1000 : 0;
          el.scrollLeft += AUTOPLAY_SPEED_PX_PER_SEC * dt;
          if (el.scrollLeft >= layout.totalWidth - 0.5) {
            setAutoplay(false);
            state.active = false;
          }
        }
        state.lastTs = ts;
      } else {
        state.lastTs = 0;
      }

      if (el) {
        const centerX = el.scrollLeft;
        const mpp = mppAtX(layout, centerX);
        const nearest = dominantIndexForX(layout, centerX);
        const maxImagePx = window.innerHeight * IMAGE_MAX_HEIGHT_VIEWPORT_FACTOR;

        for (let i = 0; i < SCALE_STOPS.length; i++) {
          const img = imageRefs.current[i];
          if (!img || !img.naturalWidth || !img.naturalHeight) continue;
          const heightPx = Math.max(IMAGE_MIN_PX, Math.min(maxImagePx, imageHeightAtMpp(SCALE_STOPS[i], mpp)));
          const widthPx = heightPx * (img.naturalWidth / img.naturalHeight);
          img.style.height = `${heightPx}px`;
          img.style.width = `${widthPx}px`;
        }

        const humanHeightPx = HUMAN_HEIGHT_METERS / mpp;
        if (humanRef.current && humanCaptionRef.current) {
          const isDot = humanHeightPx < HUMAN_DOT_THRESHOLD_PX;
          const clamped = isDot ? 2 : Math.min(maxImagePx, humanHeightPx);
          humanRef.current.style.height = `${clamped}px`;
          humanRef.current.style.width = `${clamped * HUMAN_SILHOUETTE_ASPECT}px`;
          humanCaptionRef.current.style.display = isDot ? 'block' : 'none';
        }

        if (state.active) {
          if (Math.abs(layout.xs[nearest] - centerX) < AUTOPLAY_PAUSE_EPSILON_PX && nearest !== state.lastPausedIndex) {
            state.pausedUntil = ts + AUTOPLAY_PAUSE_MS;
            state.lastPausedIndex = nearest;
          }
        }

        if (nearest !== dominantIndexRef.current) {
          setDominantIndex(nearest);
          const viewportWidth = window.innerWidth;
          setTicks(localTicks(layout, centerX, mpp, viewportWidth));
        }
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [layout, compareIndices]);

  // Initial tick computation (the rAF loop above only recomputes on a
  // dominant-stop change, which hasn't happened yet on first paint).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const mpp = mppAtX(layout, el.scrollLeft);
    setTicks(localTicks(layout, el.scrollLeft, mpp, window.innerWidth));
  }, [layout]);

  // Mouse wheel (vertical or horizontal) + hijacked trackpad swipe -> horizontal scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (compareIndicesRef.current) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      el!.scrollLeft += delta;
      stopAutoplay();
      setHasInteracted(true);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stopAutoplay]);

  // Click-and-drag on the background to scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    function onDown(e: MouseEvent) {
      if (compareIndicesRef.current) return;
      if ((e.target as HTMLElement).closest('button, a, input')) return;
      dragging = true;
      startX = e.clientX;
      startScrollLeft = el!.scrollLeft;
      el!.style.cursor = 'grabbing';
    }
    function onMove(e: MouseEvent) {
      if (!dragging) return;
      el!.scrollLeft = startScrollLeft - (e.clientX - startX);
      stopAutoplay();
      setHasInteracted(true);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      el!.style.cursor = '';
    }
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [stopAutoplay]);

  // First scroll/touch input dismisses the hint for good.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function dismiss() {
      setHasInteracted(true);
    }
    el.addEventListener('touchmove', dismiss, { passive: true, once: true });
    return () => el.removeEventListener('touchmove', dismiss);
  }, []);

  // Arrow/Home/End navigation + spacebar autoplay toggle.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setAutoplay((v) => !v);
        setHasInteracted(true);
        return;
      }

      if (compareIndicesRef.current) return;

      let targetIndex: number | null = null;
      switch (e.key) {
        case 'ArrowRight':
          targetIndex = dominantIndexRef.current + (e.shiftKey ? 3 : 1);
          break;
        case 'ArrowLeft':
          targetIndex = dominantIndexRef.current - (e.shiftKey ? 3 : 1);
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
      stopAutoplay();
      setHasInteracted(true);
      scrollToIndex(targetIndex);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToIndex, stopAutoplay]);

  function handleRailJump(index: number) {
    stopAutoplay();
    setHasInteracted(true);
    if (compareIndices) {
      pendingScrollIndexRef.current = index;
      setCompareIndices(null);
    } else {
      scrollToIndex(index);
    }
  }

  function handleCompareSelect(stopId: string) {
    const targetIndex = stopIndexFromId(stopId);
    anchorIndexRef.current = dominantIndexRef.current;
    stopAutoplay();
    setCompareIndices([dominantIndexRef.current, targetIndex]);
  }

  function handleCompareClose() {
    pendingScrollIndexRef.current = anchorIndexRef.current;
    setCompareIndices(null);
  }

  function handleImageError(index: number) {
    setBrokenImageIndices((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  const dominantStop = SCALE_STOPS[dominantIndex];

  return (
    <div className="scales-root">
      <header className="scales-header">
        <div className="scales-header-title">Scales of Wonder</div>
        <div className="scales-header-right">
          {!compareIndices && (
            <ScalesComparePicker
              stops={SCALE_STOPS}
              anchorStopId={dominantStop.id}
              onSelect={handleCompareSelect}
              fullScreen={isMobile}
            />
          )}
          <Link href="/" className="scales-header-link">
            Sky
          </Link>
          <button onClick={() => setAboutOpen((v) => !v)} aria-label="About" className="scales-about-button">
            &#9432;
          </button>
        </div>
      </header>

      {aboutOpen && <ScalesAboutPanel onClose={() => setAboutOpen(false)} />}

      {!compareIndices && <ScalesContentPanel stop={dominantStop} isMobile={isMobile} />}

      {!compareIndices && !hasInteracted && <div className="scales-hint">Scroll, drag, or press space &rarr;</div>}

      {compareIndices ? (
        <ScalesCompareView
          stopA={SCALE_STOPS[compareIndices[0]]}
          stopB={SCALE_STOPS[compareIndices[1]]}
          onClose={handleCompareClose}
        />
      ) : (
        <div ref={scrollRef} className="scales-scroll" tabIndex={0} aria-label="Scale ruler, scroll horizontally">
          <div
            className="scales-track"
            style={{
              width: `calc(100vw + ${layout.totalWidth}px)`,
              background: backgroundGradientForTrack(SCALE_STOPS),
            }}
          >
            <div className="scales-ground-line" />

            {gridlines.map((g) => (
              <div key={g.exponent} className="scales-gridline" style={{ left: `calc(50vw + ${g.x}px)` }}>
                <div className="scales-gridline-tick" />
                <div className="scales-gridline-label">{scaleLabelPlainText(g.exponent)}</div>
              </div>
            ))}

            {ticks.map((t, i) => (
              <div key={`${t.exponent}-${i}`} className="scales-minor-tick" style={{ left: `calc(50vw + ${t.x}px)` }} />
            ))}

            {SCALE_STOPS.map((stop, i) => {
              const isBroken = brokenImageIndices.has(i);
              const src = isBroken ? placeholderImageUrl(stop) : stop.image ?? placeholderImageUrl(stop);
              return (
                <div key={stop.id} className="scales-stop-anchor" style={{ left: `calc(50vw + ${layout.xs[i]}px)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated per-stop placeholder, not a static asset */}
                  <img
                    ref={(el) => {
                      imageRefs.current[i] = el;
                    }}
                    src={src}
                    alt={stop.name}
                    draggable={false}
                    className="scales-stop-image"
                    onError={() => handleImageError(i)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!compareIndices && (
        <div className="scales-human-wrap">
          <div ref={humanRef} className="scales-human" aria-hidden="true">
            <svg viewBox="0 0 100 340" width="100%" height="100%" preserveAspectRatio="none">
              <circle cx="50" cy="32" r="30" fill="#ffffff" />
              <path
                d="M30 68 C10 80 8 150 14 210 L26 210 L34 340 L46 340 L50 220 L54 340 L66 340 L74 210 L86 210 C92 150 90 80 70 68 C60 62 40 62 30 68 Z"
                fill="#ffffff"
              />
            </svg>
          </div>
          <div ref={humanCaptionRef} className="scales-human-caption" style={{ display: 'none' }}>
            human (invisible at this scale)
          </div>
        </div>
      )}

      <ScalesProgressRail stops={SCALE_STOPS} dominantIndex={dominantIndex} onJump={handleRailJump} />

      <style jsx>{`
        .scales-root {
          position: relative;
          height: 100dvh;
          overflow: hidden;
          background: #02030a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

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
          background: rgba(5, 6, 15, 0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .scales-header-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 16px;
          color: #e8ecf5;
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
          bottom: 92px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 25;
          font-size: 13px;
          color: rgba(232, 236, 245, 0.55);
          pointer-events: none;
          animation: scales-pulse 2.2s ease-in-out infinite;
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
          height: 100%;
          overflow-x: scroll;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          cursor: grab;
          scrollbar-width: none;
        }
        .scales-scroll::-webkit-scrollbar {
          display: none;
        }
        .scales-track {
          position: relative;
          height: 100%;
        }
        .scales-ground-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 70%;
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
        }
        .scales-gridline {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
        }
        .scales-gridline-tick {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .scales-gridline-label {
          position: absolute;
          bottom: 56px;
          left: 8px;
          font-family: var(--font-geist-mono, monospace);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          white-space: nowrap;
        }
        .scales-minor-tick {
          position: absolute;
          top: calc(70% - 6px);
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.25);
        }
        .scales-stop-anchor {
          position: absolute;
          top: 70%;
          transform: translate(-50%, -100%);
          display: flex;
          align-items: flex-end;
          pointer-events: none;
        }
        .scales-stop-image {
          display: block;
          width: auto;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 0 110px 36px rgba(0, 0, 0, 0.4);
        }

        .scales-human-wrap {
          position: fixed;
          left: 24px;
          top: 70%;
          z-index: 15;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-100%);
          pointer-events: none;
        }
        .scales-human {
          display: block;
          filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.3));
        }
        .scales-human-caption {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(232, 236, 245, 0.5);
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .scales-header-title {
            font-size: 14px;
          }
          .scales-human-wrap {
            left: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scales-hint {
            animation: none;
          }
          .scales-stop-image {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
