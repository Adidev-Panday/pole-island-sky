'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import * as Astronomy from 'astronomy-engine';
import { REFERENCE_MOMENT } from '@/lib/observer';
import { computeAltAz, computeLocalSiderealTime, moonPhaseName } from '@/lib/sky';
import {
  CASCO_BAY_TIME_ZONE,
  formatLocalDate,
  formatLocalTime,
  formatUtcTime,
  formatZoneAbbreviation,
  localMidnightUtc,
} from '@/lib/time';

interface TimeControlsProps {
  dateUtc: Date;
  observer: Astronomy.Observer;
  onChange: (date: Date) => void;
  /** Called (after the date jump) when "The Moment" is clicked, to trigger the scripted opening. */
  onTheMoment?: () => void;
}

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SCRUBBER_SPAN_MS = 2 * DAY_MS; // +/- 24h
const SCRUBBER_STEP_MINUTES = 1;
const SCRUBBER_MAX_MINUTES = SCRUBBER_SPAN_MS / 60000;
const ASTRO_TWILIGHT_ALTITUDE_DEG = -18;
const RISE_SET_SEARCH_DAYS = 1.1; // a touch over 1 day of search margin

function riseSetSearch(
  observer: Astronomy.Observer,
  dayStart: Date
): { rise: Date | null; set: Date | null } {
  const riseTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, dayStart, RISE_SET_SEARCH_DAYS);
  const setTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, dayStart, RISE_SET_SEARCH_DAYS);
  return { rise: riseTime?.date ?? null, set: setTime?.date ?? null };
}

function formatClock(date: Date | null): string {
  if (!date) return '--:--';
  return formatLocalTime(date, CASCO_BAY_TIME_ZONE);
}

export default function TimeControls({ dateUtc, observer, onChange, onTheMoment }: TimeControlsProps) {
  const [scrubCenter, setScrubCenter] = useState<Date>(() => new Date(REFERENCE_MOMENT));
  const [copied, setCopied] = useState(false);

  const localDate = formatLocalDate(dateUtc, CASCO_BAY_TIME_ZONE);
  const localTime = formatLocalTime(dateUtc, CASCO_BAY_TIME_ZONE);
  const zoneAbbrev = formatZoneAbbreviation(dateUtc, CASCO_BAY_TIME_ZONE);
  const utcTime = formatUtcTime(dateUtc);

  const lst = computeLocalSiderealTime(observer, dateUtc);
  // Geometric (unrefracted) altitude here, not the rendering convention:
  // matches the standard definition of twilight thresholds and what
  // SearchAltitude itself solves for (see computeAltAz's refraction param doc).
  const sunAltAz = computeAltAz(Astronomy.Body.Sun, observer, dateUtc, null);
  const moonAltAz = computeAltAz(Astronomy.Body.Moon, observer, dateUtc, null);
  const astroTime = Astronomy.MakeTime(dateUtc);
  const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);
  const moonPhaseDeg = Astronomy.MoonPhase(astroTime);

  // Rise/set only depends on the calendar date, not the exact minute - memoize
  // on the date string so dragging the scrubber within one day doesn't
  // re-run an iterative search on every tick.
  const sunRiseSet = useMemo(
    () => riseSetSearch(observer, localMidnightUtc(...parseDateParts(localDate), CASCO_BAY_TIME_ZONE)),
    [observer, localDate]
  );

  function jumpTo(newDate: Date) {
    onChange(newDate);
    setScrubCenter(newDate);
  }

  function currentDayStart(): Date {
    return localMidnightUtc(...parseDateParts(localDate), CASCO_BAY_TIME_ZONE);
  }

  function handleTheMoment() {
    jumpTo(new Date(REFERENCE_MOMENT));
    onTheMoment?.();
  }

  function handleNow() {
    jumpTo(new Date());
  }

  function handleSunset() {
    const setTime = Astronomy.SearchRiseSet(
      Astronomy.Body.Sun,
      observer,
      -1,
      currentDayStart(),
      RISE_SET_SEARCH_DAYS
    );
    if (setTime) jumpTo(setTime.date);
  }

  function handleAstronomicalDark() {
    const t = Astronomy.SearchAltitude(
      Astronomy.Body.Sun,
      observer,
      -1,
      currentDayStart(),
      RISE_SET_SEARCH_DAYS,
      ASTRO_TWILIGHT_ALTITUDE_DEG
    );
    if (t) jumpTo(t.date);
  }

  function handleAstronomicalDawn() {
    const t = Astronomy.SearchAltitude(
      Astronomy.Body.Sun,
      observer,
      1,
      currentDayStart(),
      RISE_SET_SEARCH_DAYS,
      ASTRO_TWILIGHT_ALTITUDE_DEG
    );
    if (t) jumpTo(t.date);
  }

  function handleStep(deltaMs: number) {
    jumpTo(new Date(dateUtc.getTime() + deltaMs));
  }

  function handleDateInput(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value; // "YYYY-MM-DD"
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    const [hh, mm] = localTime.split(':').map(Number);
    const dayStart = localMidnightUtc(y, m, d, CASCO_BAY_TIME_ZONE);
    jumpTo(new Date(dayStart.getTime() + (hh * 60 + mm) * 60000));
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scrubberMin = scrubCenter.getTime() - DAY_MS;
  const sliderValue = Math.min(
    SCRUBBER_MAX_MINUTES,
    Math.max(0, Math.round((dateUtc.getTime() - scrubberMin) / 60000))
  );

  function handleSliderChange(e: ChangeEvent<HTMLInputElement>) {
    const minutes = Number(e.target.value);
    onChange(new Date(scrubberMin + minutes * 60000));
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 16,
          fontSize: 12,
          lineHeight: 1.45,
          color: 'rgba(232, 236, 245, 0.75)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div>UTC: {dateUtc.toISOString()}</div>
        <div>
          Casco Bay: {localTime} {zoneAbbrev}, {localDate}
        </div>
        <div>LST: {lst.toFixed(4)} h</div>
        <div>
          Sun: alt {sunAltAz.altitudeDeg.toFixed(2)}&deg; | rise {formatClock(sunRiseSet.rise)}, set{' '}
          {formatClock(sunRiseSet.set)}
        </div>
        <div>
          Moon: alt {moonAltAz.altitudeDeg.toFixed(2)}&deg; | {moonPhaseName(moonPhaseDeg)},{' '}
          {(moonIllumination.phase_fraction * 100).toFixed(1)}% lit
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'rgba(8, 10, 20, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '12px 16px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 13,
          color: '#e8ecf5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: `${(sliderValue / SCRUBBER_MAX_MINUTES) * 100}%`,
                transform: 'translateX(-50%)',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                fontSize: 12,
                color: '#e8ecf5',
              }}
            >
              {localTime} local Casco Bay (UTC {utcTime}), {localDate}
            </div>
            <input
              className="time-slider"
              type="range"
              min={0}
              max={SCRUBBER_MAX_MINUTES}
              step={SCRUBBER_STEP_MINUTES}
              value={sliderValue}
              onChange={handleSliderChange}
              style={{ width: '100%' }}
              aria-label="Scrub time"
            />
          </div>
          <input
            type="date"
            value={localDate}
            onChange={handleDateInput}
            className="time-date-input"
            aria-label="Jump to date"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="time-btn" onClick={handleTheMoment}>
            The Moment
          </button>
          <button className="time-btn" onClick={handleNow}>
            Now
          </button>
          <button className="time-btn" onClick={handleSunset}>
            Sunset
          </button>
          <button className="time-btn" onClick={handleAstronomicalDark}>
            Astronomical dark
          </button>
          <button className="time-btn" onClick={handleAstronomicalDawn}>
            Astronomical dawn
          </button>
          <button className="time-btn" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.14)' }} />

          <button className="time-btn" onClick={() => handleStep(-HOUR_MS)}>
            &laquo; -1h
          </button>
          <button className="time-btn" onClick={() => handleStep(-10 * 60 * 1000)}>
            &lsaquo; -10m
          </button>
          <button className="time-btn" onClick={() => handleStep(10 * 60 * 1000)}>
            +10m &rsaquo;
          </button>
          <button className="time-btn" onClick={() => handleStep(HOUR_MS)}>
            +1h &raquo;
          </button>
          <button className="time-btn" onClick={() => handleStep(-DAY_MS)}>
            -1d
          </button>
          <button className="time-btn" onClick={() => handleStep(DAY_MS)}>
            +1d
          </button>
        </div>
      </div>

      <style jsx>{`
        .time-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.14);
          outline: none;
        }
        .time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e8ecf5;
          cursor: pointer;
          border: none;
        }
        .time-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e8ecf5;
          cursor: pointer;
          border: none;
        }
        .time-slider::-moz-range-track {
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.14);
        }

        .time-date-input {
          height: 28px;
          padding: 0 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #e8ecf5;
          font-size: 13px;
          color-scheme: dark;
        }

        .time-btn {
          height: 28px;
          padding: 0 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #e8ecf5;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .time-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .time-btn:active {
          background: rgba(255, 255, 255, 0.18);
        }
      `}</style>
    </>
  );
}

function parseDateParts(yyyyMmDd: string): [number, number, number] {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return [y, m, d];
}
