import type {
  AvailableSlot,
  BlackoutDate,
  Interval,
  WeeklyAvailabilityRule,
} from "./types.js";
import { addUtcDays, getZonedDateParts, toUtcDateOnly, zonedWallTimeToUtc } from "./time.js";
import { overlapsAny } from "./overlap.js";

export interface ComputeAvailableSlotsParams {
  /** Provider's recurring weekly windows, in their local timezone. */
  weeklyRules: WeeklyAvailabilityRule[];
  /** Provider's IANA timezone, e.g. "America/New_York". */
  timezone: string;
  /** Vacation / blackout date ranges (calendar dates, inclusive). */
  blackoutDates: BlackoutDate[];
  /** Busy intervals pulled from the provider's calendar (e.g. Google freebusy). */
  busyIntervals: Interval[];
  /** Length of each bookable slot, in minutes. */
  slotDurationMinutes: number;
  /** Start of the search window (absolute instant, inclusive). */
  rangeStart: Date;
  /** End of the search window (absolute instant, exclusive). */
  rangeEnd: Date;
  /** Slots starting before this instant are excluded (e.g. `new Date()` to hide the past). */
  now?: Date;
  /** Minimum notice required before a slot can be booked, in minutes. Default 60. */
  minNoticeMinutes?: number;
}

function isWithinBlackout(dateOnlyUtc: Date, blackoutDates: BlackoutDate[]): boolean {
  return blackoutDates.some((blackout) => {
    const start = toUtcDateOnly(blackout.startDate);
    const end = toUtcDateOnly(blackout.endDate);
    return dateOnlyUtc.getTime() >= start.getTime() && dateOnlyUtc.getTime() <= end.getTime();
  });
}

/**
 * Computes open, bookable slots for a provider within [rangeStart, rangeEnd), by:
 *  1. Expanding recurring weekly rules into concrete candidate slots for each calendar day.
 *  2. Dropping any day that falls inside a blackout/vacation range.
 *  3. Dropping any candidate slot that overlaps a busy interval from the real calendar.
 *  4. Dropping any candidate slot that starts too soon (less than `minNoticeMinutes` from now).
 */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailableSlot[] {
  const {
    weeklyRules,
    timezone,
    blackoutDates,
    busyIntervals,
    slotDurationMinutes,
    rangeStart,
    rangeEnd,
    now = new Date(),
    minNoticeMinutes = 60,
  } = params;

  if (slotDurationMinutes <= 0) {
    throw new Error("slotDurationMinutes must be positive");
  }

  const slots: AvailableSlot[] = [];
  const earliestBookable = new Date(now.getTime() + minNoticeMinutes * 60_000);

  // Iterate one calendar day at a time. We pad a day on each side because a UTC calendar
  // date boundary does not line up with the provider's local calendar date boundary, so
  // slots near the edges of the range could otherwise belong to a local day we'd skip.
  // Slots outside [rangeStart, rangeEnd) are filtered out below regardless.
  let cursor = addUtcDays(toUtcDateOnly(rangeStart), -1);
  const lastDay = addUtcDays(toUtcDateOnly(rangeEnd), 1);

  // Guard against pathological ranges (safety cap ~ 2 years of days).
  let safety = 0;
  while (cursor.getTime() <= lastDay.getTime() && safety < 800) {
    safety += 1;
    const { year, monthIndex0, day, dayOfWeek } = getZonedDateParts(cursor, timezone);
    // Blackout dates are plain calendar dates (no timezone component), so compare
    // against the *local* calendar date derived above, not the UTC iteration cursor
    // (which can be a different calendar date than `cursor` once timezone-shifted).
    const localDateOnly = new Date(Date.UTC(year, monthIndex0, day));

    if (!isWithinBlackout(localDateOnly, blackoutDates)) {
      const rulesForDay = weeklyRules.filter((rule) => rule.dayOfWeek === dayOfWeek);
      for (const rule of rulesForDay) {
        for (
          let minute = rule.startMinute;
          minute + slotDurationMinutes <= rule.endMinute;
          minute += slotDurationMinutes
        ) {
          const slotStart = zonedWallTimeToUtc(
            year,
            monthIndex0,
            day,
            Math.floor(minute / 60),
            minute % 60,
            timezone
          );
          const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60_000);

          if (slotStart.getTime() < rangeStart.getTime() || slotEnd.getTime() > rangeEnd.getTime()) {
            continue;
          }
          if (slotStart.getTime() < earliestBookable.getTime()) {
            continue;
          }
          if (overlapsAny({ start: slotStart, end: slotEnd }, busyIntervals)) {
            continue;
          }
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    cursor = addUtcDays(cursor, 1);
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
