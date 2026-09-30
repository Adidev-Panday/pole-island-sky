import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { DATA_DIR, PUBLIC_DATA_DIR, CACHE_DIR, HYG_URL, HYG_CACHE_PATH, fetchCached } from './lib/cache';

// Stellarium's classic "ABBR count HIP1 HIP2 ..." line-figure format was
// removed from the modern skyculture in later releases (replaced by a
// per-star-JSON polyline format); v1.2 is the last tag with it at this path.
const STELLARIUM_REF = 'v1.2';
const FAB_URL = `https://raw.githubusercontent.com/Stellarium/stellarium/${STELLARIUM_REF}/skycultures/modern/constellationship.fab`;
const FAB_CACHE_PATH = path.join(CACHE_DIR, 'constellationship.fab');

const NAMES_URL = `https://raw.githubusercontent.com/Stellarium/stellarium/${STELLARIUM_REF}/skycultures/modern/constellation_names.eng.fab`;
const NAMES_CACHE_PATH = path.join(CACHE_DIR, 'constellation_names.eng.fab');

interface HygRow {
  id: string;
  hip: string;
}

interface ConstellationOut {
  abbr: string;
  name: string;
  lines: [number, number][];
}

async function buildHipToId(): Promise<Map<number, number>> {
  const csv = await fetchCached(HYG_URL, HYG_CACHE_PATH);
  const rows: HygRow[] = parse(csv, { columns: true, skip_empty_lines: true });

  const hipToId = new Map<number, number>();
  for (const row of rows) {
    if (row.hip.trim() === '') continue;
    const hip = Number.parseInt(row.hip, 10);
    const id = Number.parseInt(row.id, 10);
    if (!hipToId.has(hip)) {
      hipToId.set(hip, id);
    }
  }
  return hipToId;
}

function parseNames(text: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const fields = line.split('\t').filter((f) => f.trim() !== '');
    const abbr = fields[0];
    const name = fields[1]?.replace(/^"|"$/g, '');
    if (abbr && name) {
      names.set(abbr, name);
    }
  }
  return names;
}

async function main() {
  const hipToId = await buildHipToId();
  console.log(`Built HIP -> HYG id map with ${hipToId.size} entries.`);

  const namesText = await fetchCached(NAMES_URL, NAMES_CACHE_PATH);
  const names = parseNames(namesText);
  console.log(`Loaded ${names.size} constellation names.`);

  const fabText = await fetchCached(FAB_URL, FAB_CACHE_PATH);

  const constellations: ConstellationOut[] = [];
  let totalSegments = 0;
  let missingHip = 0;

  for (const line of fabText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    const tokens = trimmed.split(/\s+/);
    const abbr = tokens[0];
    const segmentCount = Number.parseInt(tokens[1], 10);
    const hips = tokens.slice(2).map((t) => Number.parseInt(t, 10));

    if (hips.length !== segmentCount * 2) {
      throw new Error(
        `${abbr}: expected ${segmentCount * 2} HIP tokens, got ${hips.length}`
      );
    }

    const lines: [number, number][] = [];
    for (let i = 0; i < segmentCount; i++) {
      const hipA = hips[i * 2];
      const hipB = hips[i * 2 + 1];
      const idA = hipToId.get(hipA);
      const idB = hipToId.get(hipB);

      if (idA === undefined || idB === undefined) {
        missingHip += 1;
        console.warn(
          `${abbr}: HIP not found in HYG (hipA=${hipA} -> ${idA}, hipB=${hipB} -> ${idB}), skipping segment`
        );
        continue;
      }

      lines.push([idA, idB]);
    }

    const name = names.get(abbr);
    if (!name) {
      throw new Error(`No name found for constellation abbreviation "${abbr}"`);
    }

    constellations.push({ abbr, name, lines });
    totalSegments += lines.length;
  }

  console.log(
    `Parsed ${constellations.length} constellations, ${totalSegments} line segments, ${missingHip} missing HIPs.`
  );

  const output = { constellations };

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

  const json = JSON.stringify(output);
  writeFileSync(path.join(DATA_DIR, 'constellations.json'), json, 'utf8');
  writeFileSync(path.join(PUBLIC_DATA_DIR, 'constellations.json'), json, 'utf8');

  console.log('Wrote data/constellations.json and public/data/constellations.json.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
