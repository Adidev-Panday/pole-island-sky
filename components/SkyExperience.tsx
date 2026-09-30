'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import type { CatalogStarRecord } from '@/lib/sky';
import { zoomAroundPoint, type PanOffset } from '@/lib/projection';
import { useSceneController } from '@/hooks/useSceneController';
import SkyCanvas from '@/components/SkyCanvas';
import TimeControls from '@/components/TimeControls';
import CompassDial from '@/components/CompassDial';
import TopRightControls from '@/components/TopRightControls';
import ZoomControls from '@/components/ZoomControls';
import StarInfoPanel from '@/components/StarInfoPanel';
import BoatVignette from '@/components/BoatVignette';
import SceneCard from '@/components/SceneCard';

const URL_PARAM = 't';
const KEYBOARD_ZOOM_STEP_FACTOR = 1.4;

export default function SkyExperience() {
  const [dateUtc, setDateUtc] = useState<Date>(() => new Date(REFERENCE_MOMENT));
  const [rotationDeg, setRotationDeg] = useState(0);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [selectedStar, setSelectedStar] = useState<CatalogStarRecord | null>(null);
  const scene = useSceneController();

  // Read by the keyboard-shortcut effect below, which registers once on
  // mount - refs let it always see the latest zoom/pan without re-binding.
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stats') === '1') setStatsEnabled(true);
  }, []);

  const observer = useMemo(
    () =>
      new Astronomy.Observer(
        POLE_ISLAND.latitude,
        POLE_ISLAND.longitude,
        POLE_ISLAND.elevationMeters
      ),
    []
  );

  // Read ?t=<ISO> on mount (client-only: window isn't available during SSR).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(URL_PARAM);
    if (!raw) return;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      setDateUtc(parsed);
    }
  }, []);

  // Keep the URL in sync without navigating or polluting browser history.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, dateUtc.toISOString());
    window.history.replaceState(null, '', url);
  }, [dateUtc]);

  function handleTheMoment() {
    setDateUtc(new Date(REFERENCE_MOMENT));
    scene.start();
  }

  function handleZoomPanChange(newZoom: number, newPan: PanOffset) {
    setZoom(newZoom);
    setPan(newPan);
  }

  // Keyboard (+/-/0) and button zoom have no cursor to anchor on, so they
  // zoom toward the current viewport center - same math as wheel/pinch zoom,
  // just with a fixed anchor. useCallback (with only ref/setState deps, so
  // identity never changes) keeps the keyboard effect below happy without
  // re-binding its listener every render.
  const zoomTowardCenter = useCallback((targetZoom: number) => {
    const anchor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const { zoom: newZoom, pan: newPan } = zoomAroundPoint(zoomRef.current, panRef.current, anchor, targetZoom);
    setZoom(newZoom);
    setPan(newPan);
  }, []);

  const handleZoomIn = useCallback(() => {
    zoomTowardCenter(zoomRef.current * KEYBOARD_ZOOM_STEP_FACTOR);
  }, [zoomTowardCenter]);

  const handleZoomOut = useCallback(() => {
    zoomTowardCenter(zoomRef.current / KEYBOARD_ZOOM_STEP_FACTOR);
  }, [zoomTowardCenter]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <>
      <SkyCanvas
        dateUtc={dateUtc}
        observer={observer}
        rotationDeg={rotationDeg}
        labelsEnabled={labelsEnabled}
        scenePointerOpacity={scene.pointerOpacity}
        statsEnabled={statsEnabled}
        zoom={zoom}
        pan={pan}
        onZoomPanChange={handleZoomPanChange}
        selectedStarId={selectedStar?.id ?? null}
        onSelectStar={setSelectedStar}
      />
      <BoatVignette />
      <TimeControls
        dateUtc={dateUtc}
        observer={observer}
        onChange={setDateUtc}
        onTheMoment={handleTheMoment}
      />
      <CompassDial rotationDeg={rotationDeg} onChange={setRotationDeg} />
      <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleZoomReset} />
      <TopRightControls labelsEnabled={labelsEnabled} onToggleLabels={setLabelsEnabled} />
      {selectedStar && (
        <StarInfoPanel
          star={selectedStar}
          observer={observer}
          dateUtc={dateUtc}
          onClose={() => setSelectedStar(null)}
        />
      )}
      <SceneCard
        visible={scene.cardVisible}
        faded={scene.cardFaded}
        line3Visible={scene.line3Visible}
        onDismiss={scene.dismissCard}
      />
    </>
  );
}
