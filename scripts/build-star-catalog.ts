import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { CatalogStarRecord } from '../lib/sky';
import { DATA_DIR, PUBLIC_DATA_DIR, HYG_URL, HYG_CACHE_PATH, fetchCached } from './lib/cache';

const MAGNITUDE_LIMIT = 6.5;
const SUN_ID = 0;

// Sirius (-1.46) is the brightest real star; anything brighter than this in
// the raw catalog is not a plausible single star.
const MIN_PLAUSIBLE_MAGNITUDE = -2;

// HYG carries a handful of non-stellar entries (open clusters/asterisms)
// alongside real stars, which render as wildly oversized, uncatalogable
// circles in the sky view - drop them by their known proper names.
const NON_STELLAR_PROPER_NAMES = new Set([
  'M44',
  'Beehive',
  'Beehive Cluster',
  'Praesepe',
  'M45',
  'Pleiades',
  'h Persei',
  'chi Persei',
  'Hyades',
]);

interface HygRow {
  id: string;
  hip: string;
  ra: string;
  dec: string;
  mag: string;
  ci: string;
  spect: string;
  pmra: string;
  pmdec: string;
  proper: string;
  bayer: string;
  con: string;
  dist: string;
  absmag: string;
  lum: string;
}

// HYG's placeholder distance for stars with no measured parallax - not a
// real distance. absmag/lum derived from it are meaningless too (e.g. an
// absmag of -14 for a mag-6 star), so all three are nulled out together.
const UNKNOWN_PARALLAX_DIST_PC = 100000;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundSigFigs(value: number, sigFigs: number): number {
  if (value === 0) return 0;
  return Number(value.toPrecision(sigFigs));
}

function nullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function nullableFloat(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function magHistogram(mags: number[]): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (const mag of mags) {
    // 0.5-wide bins, e.g. "-1.5" covers [-1.5, -1.0)
    const binStart = Math.floor(mag / 0.5) * 0.5;
    const key = binStart.toFixed(1);
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  return histogram;
}

async function main() {
  const csv = await fetchCached(HYG_URL, HYG_CACHE_PATH);

  const rows: HygRow[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Parsed ${rows.length} rows from HYG catalog.`);

  const stars: CatalogStarRecord[] = [];
  let droppedSun = 0;
  let droppedFaint = 0;
  let droppedNonStellar = 0;
  let droppedImpossibleMag = 0;

  for (const row of rows) {
    const id = Number.parseInt(row.id, 10);
    if (id === SUN_ID) {
      droppedSun += 1;
      continue;
    }

    const properRaw = nullableString(row.proper);
    if (properRaw && NON_STELLAR_PROPER_NAMES.has(properRaw)) {
      droppedNonStellar += 1;
      continue;
    }

    const mag = Number.parseFloat(row.mag);
    if (Number.isNaN(mag) || mag > MAGNITUDE_LIMIT) {
      droppedFaint += 1;
      continue;
    }
    if (mag < MIN_PLAUSIBLE_MAGNITUDE) {
      droppedImpossibleMag += 1;
      continue;
    }

    const ra = Number.parseFloat(row.ra);
    const dec = Number.parseFloat(row.dec);
    const ci = nullableFloat(row.ci);
    const spectRaw = nullableString(row.spect);
    const hip = nullableFloat(row.hip);

    const distRaw = nullableFloat(row.dist);
    const hasKnownDistance = distRaw !== null && distRaw < UNKNOWN_PARALLAX_DIST_PC;
    const absmagRaw = nullableFloat(row.absmag);
    const lumRaw = nullableFloat(row.lum);

    stars.push({
      id,
      hip: hip === null ? null : Math.round(hip),
      ra: round(ra, 6),
      dec: round(dec, 5),
      mag: round(mag, 2),
      ci: ci === null ? null : round(ci, 2),
      spect: spectRaw,
      pmra: nullableFloat(row.pmra),
      pmdec: nullableFloat(row.pmdec),
      proper: properRaw,
      bayer: nullableString(row.bayer),
      con: nullableString(row.con),
      dist: hasKnownDistance ? round(distRaw!, 2) : null,
      absmag: hasKnownDistance && absmagRaw !== null ? round(absmagRaw, 2) : null,
      lum: hasKnownDistance && lumRaw !== null ? roundSigFigs(lumRaw, 3) : null,
    });
  }

  console.log(
    `Kept ${stars.length} stars (mag <= ${MAGNITUDE_LIMIT}); dropped Sun: ${droppedSun}, dropped faint: ${droppedFaint}, dropped non-stellar: ${droppedNonStellar}, dropped impossible magnitude: ${droppedImpossibleMag}.`
  );

  const catalog = {
    epoch: 2000.0,
    count: stars.length,
    stars,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  const catalogJson = JSON.stringify(catalog);
  writeFileSync(path.join(DATA_DIR, 'stars.json'), catalogJson, 'utf8');
  writeFileSync(path.join(PUBLIC_DATA_DIR, 'stars.json'), catalogJson, 'utf8');

  const meta = {
    source: HYG_URL,
    magnitudeLimit: MAGNITUDE_LIMIT,
    rawRowCount: rows.length,
    keptCount: stars.length,
    droppedSun,
    droppedFaint,
    droppedNonStellar,
    droppedImpossibleMag,
    magnitudeHistogram: magHistogram(stars.map((s) => s.mag)),
    nullCounts: {
      ci: stars.filter((s) => s.ci === null).length,
      spect: stars.filter((s) => s.spect === null).length,
      pmra: stars.filter((s) => s.pmra === null).length,
      pmdec: stars.filter((s) => s.pmdec === null).length,
      proper: stars.filter((s) => s.proper === null).length,
      bayer: stars.filter((s) => s.bayer === null).length,
      con: stars.filter((s) => s.con === null).length,
      hip: stars.filter((s) => s.hip === null).length,
      dist: stars.filter((s) => s.dist === null).length,
      absmag: stars.filter((s) => s.absmag === null).length,
      lum: stars.filter((s) => s.lum === null).length,
    },
  };

  writeFileSync(
    path.join(DATA_DIR, 'stars.meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
    'utf8'
  );

  console.log(`Wrote data/stars.json and public/data/stars.json (${stars.length} stars).`);
  console.log('Wrote data/stars.meta.json.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
