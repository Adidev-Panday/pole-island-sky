# Pole Island Sky Viewer

Recreates the night sky Alan Lightman describes from his island in Casco
Bay, Maine, in *Searching for Stars on an Island in Maine* (2018).

## Status

This is prompt 1 of a planned 7: scaffold plus an astronomy-accuracy
foundation. Star catalog rendering, Canvas drawing, constellations, and UI
come later. Right now `/` is a plain verification table proving the
astronomy math is correct, not the final viewer.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + ESLint
- [`astronomy-engine`](https://github.com/cosinekitty/astronomy) for all
  time and coordinate transforms

## Key files

- `lib/observer.ts` — `POLE_ISLAND` (observer location, a placeholder proxy
  for Lightman's unnamed 30-acre island) and `REFERENCE_MOMENT` (a
  placeholder date/time for the night described in the book — not stated in
  the book itself)
- `lib/sky.ts` — `computeAltAz`, converting either an `astronomy-engine`
  `Body` or a J2000 catalog star (`{ raHours, decDegrees }`) to topocentric
  altitude/azimuth, precessing/nutating catalog coordinates to the equator
  of date before the horizontal transform
- `app/page.tsx` — verification table (Polaris, Sun, Moon + illumination,
  Jupiter, Saturn, Venus, Mars, local sidereal time) for `REFERENCE_MOMENT`
  at `POLE_ISLAND`, with a cross-check against JPL Horizons in a comment

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm run lint    # ESLint
npx tsc --noEmit  # type-check
```

## Deploy

Deployment (Vercel) is out of scope until prompt 7. Once ready:

```bash
npx vercel
```
