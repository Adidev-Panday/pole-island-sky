import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { CACHE_DIR, PUBLIC_DATA_DIR, fetchCached } from './lib/cache';

const MW_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/mw.json';
const MW_CACHE_PATH = path.join(CACHE_DIR, 'mw.json');

async function main() {
  const json = await fetchCached(MW_URL, MW_CACHE_PATH);

  // Sanity-check it's the GeoJSON we expect before shipping it verbatim.
  const parsed = JSON.parse(json);
  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('mw.json does not look like a GeoJSON FeatureCollection');
  }

  mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  writeFileSync(path.join(PUBLIC_DATA_DIR, 'mw.json'), json, 'utf8');

  console.log(
    `Wrote public/data/mw.json (${parsed.features.length} brightness contours, verbatim from d3-celestial).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
