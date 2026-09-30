'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import { useSceneController } from '@/hooks/useSceneController';
import SkyCanvas from '@/components/SkyCanvas';
import TimeControls from '@/components/TimeControls';
import CompassDial from '@/components/CompassDial';
import TopRightControls from '@/components/TopRightControls';
import BoatVignette from '@/components/BoatVignette';
import SceneCard from '@/components/SceneCard';

const URL_PARAM = 't';

export default function SkyExperience() {
  const [dateUtc, setDateUtc] = useState<Date>(() => new Date(REFERENCE_MOMENT));
  const [rotationDeg, setRotationDeg] = useState(0);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const scene = useSceneController();

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

  return (
    <>
      <SkyCanvas
        dateUtc={dateUtc}
        observer={observer}
        rotationDeg={rotationDeg}
        labelsEnabled={labelsEnabled}
        scenePointerOpacity={scene.pointerOpacity}
      />
      <BoatVignette />
      <TimeControls
        dateUtc={dateUtc}
        observer={observer}
        onChange={setDateUtc}
        onTheMoment={handleTheMoment}
      />
      <CompassDial rotationDeg={rotationDeg} onChange={setRotationDeg} />
      <TopRightControls labelsEnabled={labelsEnabled} onToggleLabels={setLabelsEnabled} />
      <SceneCard
        visible={scene.cardVisible}
        faded={scene.cardFaded}
        line3Visible={scene.line3Visible}
        onDismiss={scene.dismissCard}
      />
    </>
  );
}
