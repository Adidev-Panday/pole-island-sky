# Pole Island Sky Viewer

Recreates the night sky Alan Lightman describes from his island in Casco
Bay, Maine, in *Searching for Stars on an Island in Maine* (2018).

## Status

This is prompt 2 of a planned 7: HYG star catalog plus a fixed (non-interactive)
canvas render of the naked-eye sky at `REFERENCE_MOMENT`. Constellation lines,
planets/Moon/Sun on the canvas, the Milky Way, star colors, and any
interactivity come later.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + ESLint
- [`astronomy-engine`](https://github.com/cosinekitty/astronomy) for all
  time and coordinate transforms
- [HYG star catalog v4.1](https://github.com/astronexus/HYG-Database)
  (public domain), filtered to the naked-eye subset (mag &le; 6.5)
- Canvas 2D for rendering
- Vitest for unit tests

## First-time setup

**Run this once before `npm run dev` or `npm run build`** — the star
catalog (`data/stars.json` / `public/data/stars.json`) is committed, so a
fresh clone already has it, but if you ever need to regenerate it (new HYG
release, filter changes) run:

```bash
npm install
npm run build:stars   # downloads/caches HYG v4.1, writes data/stars.json + public/data/stars.json
```

## Key files

- `lib/observer.ts` — `POLE_ISLAND` (observer location, a placeholder proxy
  for Lightman's unnamed 30-acre island) and `REFERENCE_MOMENT` (a
  placeholder date/time for the night described in the book — not stated in
  the book itself)
- `lib/sky.ts` — `computeAltAz` (astronomy-engine `Body` or J2000
  `{ raHours, decDegrees }` &rarr; topocentric alt/az), `applyProperMotion`
  and `computeStarAltAz` for catalog stars (advances J2000 RA/Dec by proper
  motion before the alt/az transform)
- `lib/projection.ts` — zenith-centered stereographic projection (alt/az
  &rarr; canvas pixels), unit-tested in `lib/projection.test.ts`
- `scripts/build-star-catalog.ts` — downloads/caches HYG v4.1, filters to
  mag &le; 6.5, writes `data/stars.json` + `public/data/stars.json` +
  `data/stars.meta.json` (counts, magnitude histogram, null counts)
- `components/SkyCanvas.tsx` — full-viewport, DPR-aware canvas rendering
  every above-horizon star at `REFERENCE_MOMENT`
- `app/page.tsx` — renders `<SkyCanvas />`
- `app/verify/page.tsx` — the prompt-1 verification table (Polaris, Sun,
  Moon, planets, local sidereal time), kept as an accuracy record, with
  cross-checks and known prompt/reality mismatches noted in a comment

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the sky view, http://localhost:3000/verify
for the accuracy table.

```bash
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest (lib/projection.test.ts)
npx tsc --noEmit    # type-check
npm run build:stars # regenerate the star catalog from HYG
```

## Deploy

Deployment (Vercel) is out of scope until prompt 7. Once ready:

```bash
npx vercel
```
