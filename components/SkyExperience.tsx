'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import { POLE_ISLAND, REFERENCE_MOMENT } from '@/lib/observer';
import SkyCanvas from '@/components/SkyCanvas';
import TimeControls from '@/components/TimeControls';

const URL_PARAM = 't';

export default function SkyExperience() {
  const [dateUtc, setDateUtc] = useState<Date>(() => new Date(REFERENCE_MOMENT));

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

  return (
    <>
      <SkyCanvas dateUtc={dateUtc} observer={observer} />
      <TimeControls dateUtc={dateUtc} observer={observer} onChange={setDateUtc} />
    </>
  );
}
