import type { CatalogStarRecord } from './sky';

const PARSECS_TO_LIGHT_YEARS = 3.26156;

const GREEK_LETTERS: Record<string, string> = {
  Alp: 'α',
  Bet: 'β',
  Gam: 'γ',
  Del: 'δ',
  Eps: 'ε',
  Zet: 'ζ',
  Eta: 'η',
  The: 'θ',
  Iot: 'ι',
  Kap: 'κ',
  Lam: 'λ',
  Mu: 'μ',
  Nu: 'ν',
  Xi: 'ξ',
  Omi: 'ο',
  Pi: 'π',
  Rho: 'ρ',
  Sig: 'σ',
  Tau: 'τ',
  Ups: 'υ',
  Phi: 'φ',
  Chi: 'χ',
  Psi: 'ψ',
  Ome: 'ω',
};

/** Bayer designation as a Greek letter, e.g. "Alp" -> "α". Falls back to the raw string. */
export function bayerGreekLetter(bayer: string): string {
  return GREEK_LETTERS[bayer] ?? bayer;
}

/** Short canvas label: Greek letter alone (e.g. "α"), no constellation. */
export function bayerShortLabel(bayer: string): string {
  return bayerGreekLetter(bayer);
}

/**
 * Display name, in order of preference: proper name, Bayer designation +
 * constellation (e.g. "α Lyr"), "HIP {number}", or a last-resort catalog id.
 */
export function starDisplayName(star: CatalogStarRecord): string {
  if (star.proper) return star.proper;
  if (star.bayer) return `${bayerGreekLetter(star.bayer)}${star.con ? ` ${star.con}` : ''}`;
  if (star.hip !== null) return `HIP ${star.hip}`;
  return `Star ${star.id}`;
}

/**
 * "X light-years": 1 decimal below 100 ly, whole number at/above. Null (row
 * should be omitted entirely, not shown as a placeholder) if dist is absent
 * from the catalog or not a finite number.
 */
export function formatDistanceLightYears(distParsecs: number | null): string | null {
  if (distParsecs === null || !Number.isFinite(distParsecs)) return null;
  const ly = distParsecs * PARSECS_TO_LIGHT_YEARS;
  const formatted =
    ly < 100
      ? ly.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : Math.round(ly).toLocaleString('en-US');
  return `${formatted} light-years`;
}

/**
 * "X times the Sun", nicely formatted (1.0, 25, 8,700, 1.2 million). Null
 * (row should be omitted entirely) if lum is absent, not finite, or not a
 * positive number (a non-positive luminosity isn't physically meaningful).
 */
export function formatLuminosity(lumSolar: number | null): string | null {
  if (lumSolar === null || !Number.isFinite(lumSolar) || lumSolar <= 0) return null;
  let formatted: string;
  if (lumSolar >= 1_000_000) {
    formatted = `${(lumSolar / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} million`;
  } else if (lumSolar < 10) {
    formatted = lumSolar.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } else {
    formatted = Math.round(lumSolar).toLocaleString('en-US');
  }
  return `${formatted} times the Sun`;
}

const SPECTRAL_CLASS_DESCRIPTIONS: Record<string, string> = {
  O: 'blue',
  B: 'blue-white',
  A: 'hot blue-white',
  F: 'yellow-white',
  G: 'yellow',
  K: 'orange',
  M: 'red',
};

// Alternatives ordered so that, at any shared starting position, the more
// specific token is tried first (e.g. "IV" before bare "I", "Iab" before
// "Ia" before "Ib" before bare "I") - regex alternation takes the first
// alternative that matches at the leftmost position, so ordering within a
// shared prefix is what keeps e.g. "IV" from being misread as "I".
const LUMINOSITY_CLASS_PATTERN = /IV|III|II|Iab|Ia|Ib|I|VI|V/;

function luminosityPhraseForToken(token: string): string {
  switch (token) {
    case 'IV':
      return 'subgiant';
    case 'III':
      return 'giant';
    case 'II':
      return 'bright giant';
    case 'VI':
      return 'subdwarf';
    case 'V':
      return 'main sequence';
    default: // Iab, Ia, Ib, I
      return 'supergiant';
  }
}

/**
 * Friendly parenthetical for a spectral type, e.g. "A0Vvar" -> "hot
 * blue-white main sequence", "M2Ib" -> "red supergiant". Looks up the
 * leading OBAFGKM letter for a color/temperature phrase, and searches the
 * rest of the string for the first (leftmost) MK luminosity class token for
 * a life-stage phrase - important for messy real catalog strings like
 * Polaris's "F7:Ib-IIv SB", where the *first* class (Ib, supergiant) is the
 * primary one, even though "II" also appears later (from the "-II"
 * uncertainty range) and must not win instead. Either half may be missing;
 * returns null only if neither is found.
 */
export function spectralClassDescription(spect: string | null): string | null {
  if (!spect) return null;
  const letter = spect.charAt(0).toUpperCase();
  const colorPhrase = SPECTRAL_CLASS_DESCRIPTIONS[letter];

  const match = spect.slice(1).match(LUMINOSITY_CLASS_PATTERN);
  const luminosityPhrase = match ? luminosityPhraseForToken(match[0]) : null;

  if (colorPhrase && luminosityPhrase) return `${colorPhrase} ${luminosityPhrase}`;
  return colorPhrase ?? luminosityPhrase;
}
