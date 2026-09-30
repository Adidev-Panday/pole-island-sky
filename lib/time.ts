export const CASCO_BAY_TIME_ZONE = 'America/New_York';

interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset (minutes) to add to a UTC instant to get local wall-clock time in `timeZone`. */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = getLocalDateParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - date.getTime()) / 60000;
}

/** The UTC instant corresponding to local midnight (00:00:00) on year-month-day in `timeZone`. */
export function localMidnightUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  // Two passes converge even right at a DST transition boundary.
  for (let i = 0; i < 2; i++) {
    const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
    guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60000);
  }
  return guess;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "YYYY-MM-DD" for `date` as seen in `timeZone`. */
export function formatLocalDate(date: Date, timeZone: string): string {
  const p = getLocalDateParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** "HH:MM" (24h) for `date` as seen in `timeZone`. */
export function formatLocalTime(date: Date, timeZone: string): string {
  const p = getLocalDateParts(date, timeZone);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** Short zone abbreviation ("EDT"/"EST") for `date` in `timeZone`. */
export function formatZoneAbbreviation(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  });
  const part = formatter.formatToParts(date).find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/** "HH:MM" (24h) in UTC. */
export function formatUtcTime(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}
