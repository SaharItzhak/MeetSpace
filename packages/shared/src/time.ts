/**
 * Timezone-aware helpers built on the Intl API (no external deps) so the package
 * stays lightweight and portable to React Native later (Hermes supports Intl with
 * the standard polyfill).
 */

/**
 * Returns how far ahead UTC is of `timeZone` at the given instant, in milliseconds
 * (i.e. `utc - tzOffset`). Both branches are parsed with the *same* ambient system
 * timezone via `Date` string parsing, so that bias cancels out of the subtraction —
 * this is what makes the trick correct regardless of the host machine's own timezone.
 */
function getUtcOffsetMs(timeZone: string, instant: Date): number {
  const utcStr = instant.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = instant.toLocaleString("en-US", { timeZone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Converts a "wall clock" date/time in a given IANA timezone to an absolute UTC Date.
 * Accurate to the minute for all real-world timezones; does not special-case the rare
 * wall-clock hour that repeats/skips during a DST transition.
 */
export function zonedWallTimeToUtc(
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, monthIndex0, day, hour, minute, 0, 0));
  const offsetMs = getUtcOffsetMs(timeZone, utcGuess);
  return new Date(utcGuess.getTime() + offsetMs);
}

/** Returns the {year, monthIndex0, day, dayOfWeek} for an instant, as observed in `timeZone`. */
export function getZonedDateParts(
  instant: Date,
  timeZone: string
): { year: number; monthIndex0: number; day: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    monthIndex0: Number(map.month) - 1,
    day: Number(map.day),
    dayOfWeek: weekdayMap[map.weekday ?? "Sun"] ?? 0,
  };
}

/** Adds `days` calendar days to a UTC-midnight date (used for iterating a date range). */
export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Truncates an instant to UTC midnight of the same calendar date. */
export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
