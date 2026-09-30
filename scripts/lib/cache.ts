import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export const CACHE_DIR = path.join(__dirname, '..', '.cache');
export const DATA_DIR = path.join(__dirname, '..', '..', 'data');
export const PUBLIC_DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');

export const HYG_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
export const HYG_CACHE_PATH = path.join(CACHE_DIR, 'hygdata_v41.csv');

/** Downloads `url` to `cachePath` if not already cached, then returns its text. */
export async function fetchCached(url: string, cachePath: string): Promise<string> {
  if (existsSync(cachePath)) {
    console.log(`Using cached file at ${cachePath}`);
    return readFileSync(cachePath, 'utf8');
  }

  console.log(`Downloading ${url} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();

  mkdirSync(path.dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, text, 'utf8');
  console.log(`Cached to ${cachePath}`);
  return text;
}
