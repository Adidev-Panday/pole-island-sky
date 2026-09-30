# Pole Island Sky Viewer

Recreates the night sky Alan Lightman describes from his island in Casco
Bay, Maine, in *Searching for Stars on an Island in Maine* (2018).

## Status

This is prompt 6 of a planned 7: visual polish. Stars are colored from their
B-V index, bright stars (mag &lt; 1.5) get a soft glow, atmospheric
extinction dims everything toward the horizon (stars/planets/constellation
lines), and a smoothly-interpolated twilight gradient paints the sky when
the sun is within 5&deg; above to 18&deg; below the horizon. The Milky Way
got a warm tint and a cached, blurred glow layer for its two brightest
bands. The whole UI is now responsive down to iPhone SE width (collapsible
info readout, a "More" dropdown for the less-common presets, a smaller
bottom-left compass, icon-sized top-right controls). A `?stats=1` overlay
shows live frame/recompute time and star counts. Location is still fixed at
`POLE_ISLAND`; only deployment (prompt 7) remains after this.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + ESLint
- [`astronomy-engine`](https://github.com/cosinekitty/astronomy) for all
  time and coordinate transforms
- [HYG star catalog v4.1](https://github.com/astronexus/HYG-Database)
  (public domain), filtered to the naked-eye subset (mag &le; 6.5)
- Constellation line figures from
  [Stellarium](https://github.com/Stellarium/stellarium)'s modern skyculture
  (`skycultures/modern/constellationship.fab` +
  `constellation_names.eng.fab`, tag `v1.2` — later releases moved this data
  to a JSON format at a different path). GPL-2; a factual line-segment/name
  table, credited here per its license.
- Milky Way outline from
  [d3-celestial](https://github.com/ofrohn/d3-celestial)'s `data/mw.json`
  (5 GeoJSON brightness contours, J2000 equatorial). BSD-3, credited here.
- Canvas 2D for rendering
- Vitest for unit tests

## First-time setup

**Run this once before `npm run dev` or `npm run build`** — all generated
data (`data/stars.json`, `data/constellations.json`,
`public/data/{stars,constellations,mw}.json`) is committed, so a fresh
clone already has it. Regenerate only if you need to (new HYG/Stellarium
release, filter changes):

```bash
npm install
npm run build:data   # runs build:stars, build:constellations, build:milkyway in order
```

## Key files

- `lib/observer.ts` — `POLE_ISLAND` (observer location, a placeholder proxy
  for Lightman's unnamed 30-acre island) and `REFERENCE_MOMENT` (a
  placeholder date/time for the night described in the book — not stated in
  the book itself)
- `lib/sky.ts` — `computeAltAz` (astronomy-engine `Body` or J2000
  `{ raHours, decDegrees }` &rarr; topocentric alt/az, optional refraction
  override), `applyProperMotion` and `computeStarAltAz` for catalog stars,
  `computeLocalSiderealTime`, `moonPhaseName`
- `lib/time.ts` — dependency-free `America/New_York` local-time helpers
  (`formatLocalDate`, `formatLocalTime`, `formatZoneAbbreviation`,
  `localMidnightUtc`), used by `TimeControls` for display and for the
  Sunset/Astronomical dark/dawn presets' day-boundary searches
- `lib/projection.ts` — zenith-centered stereographic projection (alt/az
  &rarr; canvas pixels), with an optional `rotationDeg` (compass rotation,
  applied per-point so text labels are never themselves rotated),
  unit-tested in `lib/projection.test.ts`
- `lib/labels.ts` — the curated always-labeled star list and label
  thresholds (star altitude, constellation visible-fraction)
- `lib/starColor.ts` — `bvToRgb`, a piecewise-linear B-V &rarr; RGB
  approximation, unit-tested (including against real HYG catalog B-V values
  for Vega/Betelgeuse/Arcturus, cross-checked by sampling actual rendered
  canvas pixels, not just the math in isolation)
- `lib/extinction.ts` — `effectiveMagnitude` (Kasten &amp; Young 1989
  airmass model, 0.28 mag/airmass) and `horizonFadeFactor`, used to dim
  stars/planets/constellation lines toward the horizon
- `lib/twilight.ts` — `twilightGradientForAltitude` and `horizonGlowAlpha`,
  smoothly interpolating the dawn/dusk sky gradient across sun altitude
- `scripts/lib/cache.ts` — shared download/cache helper used by all three
  build scripts below
- `scripts/build-star-catalog.ts` — downloads/caches HYG v4.1, filters to
  mag &le; 6.5, writes `data/stars.json` + `public/data/stars.json` +
  `data/stars.meta.json`
- `scripts/build-constellations.ts` — downloads/caches Stellarium's line
  figures + names, cross-references HIP numbers against the HYG catalog's
  `hip` column to resolve each line segment to the HYG `id`s used in
  `data/stars.json`, writes `data/constellations.json` +
  `public/data/constellations.json`
- `scripts/build-milkyway.ts` — downloads/caches d3-celestial's `mw.json`,
  copies it verbatim to `public/data/mw.json`
- `components/SkyCanvas.tsx` — full-viewport, DPR-aware canvas: background,
  twilight gradient, Milky Way (tinted, with a cached blurred-glow layer for
  the 2 brightest bands), constellation lines (per-segment horizon fade),
  stars (B-V colored, extinction-dimmed, glow pass for mag &lt; 1.5),
  planets, Sun, Moon (with phase), star + constellation labels, scene
  pointers, horizon circle + cardinal labels — all rotate together via
  `rotationDeg`. Controlled (`dateUtc` + `observer` + `rotationDeg` +
  `labelsEnabled` + `scenePointerOpacity` + `statsEnabled` props); astronomy
  recompute runs in a throttled (30/sec) `requestAnimationFrame` loop, but
  rotation/labels/pointer-opacity changes trigger an unthrottled
  reprojection-only redraw (no astronomy recompute). `?stats=1` shows a
  small frame-time/recompute-time/star-count overlay; a recompute over 25ms
  logs a console warning once per session
- `components/TimeControls.tsx` — scrubber, date picker, presets, step
  buttons, copy-link, and the top-left info readout. Responsive: on narrow
  screens the readout collapses to 3 lines (tap to expand), Sunset/
  Astronomical dark/dawn move into a "More" dropdown, and the scrubber/date
  input stack vertically
- `components/CompassDial.tsx` — rotation dial (drag to rotate, snaps within
  3&deg; of 0, Reset button); bottom-right at 60px on desktop, bottom-left
  at 48px on narrow screens
- `components/TopRightControls.tsx` — Labels toggle + About (&#9432;) button;
  becomes 32x32 icon buttons on narrow screens
- `hooks/useIsMobile.ts` — shared `matchMedia`-backed narrow-viewport check
  used by the above plus `SceneCard`
- `components/AboutPanel.tsx` — credits/attribution panel
- `components/BoatVignette.tsx` — bottom gradient + abstract gunwale curve
- `components/SceneCard.tsx` — the opening attribution card (hardcoded
  text per the prompt 5 spec, not sourced from `data/passages.json` — see
  below)
- `hooks/useSceneController.ts` — drives "The Moment"'s scripted timeline
  (card hold/fade, pointer fade-in/hold/fade-out); any `pointerdown` /
  `keydown` / `wheel` while active cancels it immediately
- `data/passages.json` — 3 placeholder (paraphrase) excerpts with a
  `manual` / `sky-feature` trigger schema. Not yet consumed by any UI in
  this prompt (the scene card's own text is hardcoded, matching the prompt's
  literal Line 3/4 wording) — this is scaffolding for real quotes later
- `components/SkyExperience.tsx` — owns `dateUtc`/`rotationDeg`/
  `labelsEnabled` state and the scene controller, wires everything together,
  and syncs `?t=<ISO>` in the URL (`history.replaceState`, read back on
  mount)
- `app/page.tsx` — renders `<SkyExperience />`
- `app/verify/page.tsx` — the prompt-1 verification table (Polaris, Sun,
  Moon, planets, local sidereal time), kept as an accuracy record, with
  cross-checks and known prompt/reality mismatches noted in a comment

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the sky view, http://localhost:3000/verify
for the accuracy table. Check the browser console for planet altitudes,
constellation segment counts, and Milky Way ring counts logged on load.

```bash
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest (lib/projection.test.ts)
npx tsc --noEmit    # type-check
npm run build:data  # regenerate all generated data from source
```

## Deploy

Deployment (Vercel) is out of scope until prompt 7. Once ready:

```bash
npx vercel
```
