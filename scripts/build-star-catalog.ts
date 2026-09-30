import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { CatalogStarRecord } from '../lib/sky';

const HYG_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';

const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_PATH = path.join(CACHE_DIR, 'hygdata_v41.csv');
const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const MAGNITUDE_LIMIT = 6.5;
const SUN_ID = 0;

interface HygRow {
  id: string;
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
}

async function ensureCsvCached(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    console.log(`Using cached HYG catalog at ${CACHE_PATH}`);
    return readFileSync(CACHE_PATH, 'utf8');
  }

  console.log(`Downloading HYG v4.1 catalog from ${HYG_URL} ...`);
  const response = await fetch(HYG_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to download HYG catalog: ${response.status} ${response.statusText}`
    );
  }
  const csv = await response.text();

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, csv, 'utf8');
  console.log(`Cached HYG catalog to ${CACHE_PATH}`);
  return csv;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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
  const csv = await ensureCsvCached();

  const rows: HygRow[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Parsed ${rows.length} rows from HYG catalog.`);

  const stars: CatalogStarRecord[] = [];
  let droppedSun = 0;
  let droppedFaint = 0;

  for (const row of rows) {
    const id = Number.parseInt(row.id, 10);
    if (id === SUN_ID) {
      droppedSun += 1;
      continue;
    }

    const mag = Number.parseFloat(row.mag);
    if (Number.isNaN(mag) || mag > MAGNITUDE_LIMIT) {
      droppedFaint += 1;
      continue;
    }

    const ra = Number.parseFloat(row.ra);
    const dec = Number.parseFloat(row.dec);
    const ci = nullableFloat(row.ci);
    const spectRaw = nullableString(row.spect);

    stars.push({
      id,
      ra: round(ra, 6),
      dec: round(dec, 5),
      mag: round(mag, 2),
      ci: ci === null ? null : round(ci, 2),
      spect: spectRaw === null ? null : spectRaw.charAt(0),
      pmra: nullableFloat(row.pmra),
      pmdec: nullableFloat(row.pmdec),
      proper: nullableString(row.proper),
      bayer: nullableString(row.bayer),
      con: nullableString(row.con),
    });
  }

  console.log(
    `Kept ${stars.length} stars (mag <= ${MAGNITUDE_LIMIT}); dropped Sun: ${droppedSun}, dropped faint: ${droppedFaint}.`
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
    magnitudeHistogram: magHistogram(stars.map((s) => s.mag)),
    nullCounts: {
      ci: stars.filter((s) => s.ci === null).length,
      spect: stars.filter((s) => s.spect === null).length,
      pmra: stars.filter((s) => s.pmra === null).length,
      pmdec: stars.filter((s) => s.pmdec === null).length,
      proper: stars.filter((s) => s.proper === null).length,
      bayer: stars.filter((s) => s.bayer === null).length,
      con: stars.filter((s) => s.con === null).length,
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
