'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Timeline (see prompt 5 spec). "fades out over 800s" in the prompt is
// treated as a typo for 800ms - 800 seconds makes no sense for a UI fade,
// and every other duration in the same list is in the hundreds-of-ms/few-s
// range.
export const CARD_HOLD_MS = 3500;
export const CARD_FADE_MS = 1200;
export const LINE3_DELAY_MS = 400;
const POINTER_SPAWN_DELAY_AFTER_FADE_START_MS = 800;
const POINTER_FADE_IN_MS = 400;
const POINTER_HOLD_MS = 6000;
const POINTER_FADE_OUT_MS = 800;

const POINTER_SPAWN_AT_MS = CARD_HOLD_MS + POINTER_SPAWN_DELAY_AFTER_FADE_START_MS;
const POINTER_FADE_OUT_START_AT_MS = POINTER_SPAWN_AT_MS + POINTER_FADE_IN_MS + POINTER_HOLD_MS;
const POINTER_DONE_AT_MS = POINTER_FADE_OUT_START_AT_MS + POINTER_FADE_OUT_MS;

export interface SceneController {
  /** True while the scripted opening is running (card and/or pointers active). */
  active: boolean;
  /** Card should be mounted (stays true after fade, until dismissed). */
  cardVisible: boolean;
  /** True once the card has started fading to its resting 0.08 opacity. */
  cardFaded: boolean;
  /** Line 3's delayed fade-in has started. */
  line3Visible: boolean;
  /** 0..1, smoothly animated: pointer fade-in/hold/fade-out. */
  pointerOpacity: number;
  /** Starts (or restarts) the scripted opening. */
  start: () => void;
  /** Cancels the scene immediately, dropping to normal state. */
  cancel: () => void;
  /** Fully removes the faded card (click-to-dismiss). */
  dismissCard: () => void;
}

export function useSceneController(): SceneController {
  const [active, setActive] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [cardFaded, setCardFaded] = useState(false);
  const [line3Visible, setLine3Visible] = useState(false);
  const [pointerOpacity, setPointerOpacity] = useState(0);

  const timeoutIdsRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    for (const id of timeoutIdsRef.current) window.clearTimeout(id);
    timeoutIdsRef.current = [];
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimers();
    setActive(false);
    setCardVisible(false);
    setCardFaded(false);
    setLine3Visible(false);
    setPointerOpacity(0);
  }, [clearTimers]);

  const dismissCard = useCallback(() => {
    setCardVisible(false);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setActive(true);
    setCardVisible(true);
    setCardFaded(false);
    setLine3Visible(false);
    setPointerOpacity(0);

    const schedule = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      timeoutIdsRef.current.push(id);
    };

    schedule(LINE3_DELAY_MS, () => setLine3Visible(true));
    schedule(CARD_HOLD_MS, () => setCardFaded(true));

    schedule(POINTER_SPAWN_AT_MS, () => {
      const animationStart = performance.now();
      function tick() {
        const elapsed = performance.now() - animationStart;
        if (elapsed < POINTER_FADE_IN_MS) {
          setPointerOpacity(elapsed / POINTER_FADE_IN_MS);
        } else if (elapsed < POINTER_FADE_IN_MS + POINTER_HOLD_MS) {
          setPointerOpacity(1);
        } else if (elapsed < POINTER_FADE_IN_MS + POINTER_HOLD_MS + POINTER_FADE_OUT_MS) {
          const fadeElapsed = elapsed - POINTER_FADE_IN_MS - POINTER_HOLD_MS;
          setPointerOpacity(1 - fadeElapsed / POINTER_FADE_OUT_MS);
        } else {
          setPointerOpacity(0);
          rafIdRef.current = null;
          return;
        }
        rafIdRef.current = requestAnimationFrame(tick);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    });

    schedule(POINTER_DONE_AT_MS, () => {
      setActive(false);
      // cardVisible/cardFaded stay as-is: faded card remains, dismissable.
    });
  }, [clearTimers]);

  // Any user input while the scene is active cancels it immediately.
  useEffect(() => {
    if (!active) return;
    const handleInteraction = () => cancel();
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('wheel', handleInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
    };
  }, [active, cancel]);

  useEffect(() => clearTimers, [clearTimers]);

  return { active, cardVisible, cardFaded, line3Visible, pointerOpacity, start, cancel, dismissCard };
}
