# Pole Island Sky Viewer

Recreates the night sky Alan Lightman describes from his island in Casco
Bay, Maine, in *Searching for Stars on an Island in Maine* (2018).

## Status

This is prompt 5 of a planned 7: the Lightman framing. "The Moment" now
triggers a scripted opening (attribution card, then pointers to the Summer
Triangle + Polaris + the Milky Way's densest arc); bright stars and
above-horizon constellations get labels (toggle top-right); a bottom-right
compass dial rotates the whole sky around zenith; a subtle bottom vignette
suggests the boat; an About panel credits sources. `data/passages.json`
holds placeholder (paraphrase) excerpts, not yet wired into any UI — real
quotes are the user's to supply. Location is still fixed at `POLE_ISLAND`;
star colors and atmospheric extinction/twilight come later.

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
- `components/SkyCanvas.tsx` — full-viewport, DPR-aware canvas: Milky Way,
  constellation lines, stars, planets, Sun, Moon (with phase), star +
  constellation labels, scene-opening pointers, horizon circle + cardinal
  labels — all rotate together via `rotationDeg`. Controlled (`dateUtc` +
  `observer` + `rotationDeg` + `labelsEnabled` + `scenePointerOpacity`
  props); astronomy recompute runs in a throttled (30/sec)
  `requestAnimationFrame` loop, but rotation/labels/pointer-opacity changes
  trigger an unthrottled reprojection-only redraw (no astronomy recompute)
- `components/TimeControls.tsx` — scrubber, date picker, presets, step
  buttons, copy-link, and the top-left info readout
- `components/CompassDial.tsx` — bottom-right rotation dial (drag to
  rotate, snaps within 3&deg; of 0, Reset button)
- `components/TopRightControls.tsx` — Labels toggle + About (&#9432;) button
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
