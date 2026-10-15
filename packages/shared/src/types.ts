/**
 * Core domain types shared between the web app and any future client (e.g. mobile).
 * Kept framework-agnostic (no Next.js / Prisma imports) so this package can be reused
 * by a React Native app later.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday ... 6 = Saturday

/** A single recurring weekly availability window, in the provider's local timezone. */
export interface WeeklyAvailabilityRule {
  id?: string;
  dayOfWeek: DayOfWeek;
  /** Minutes since local midnight, e.g. 9:00am = 540. */
  startMinute: number;
  /** Minutes since local midnight, exclusive end, e.g. 5:00pm = 1020. */
  endMinute: number;
}

/** A blackout / vacation date range during which no slots should be offered. */
export interface BlackoutDate {
  id?: string;
  /** Inclusive start date (UTC midnight of that calendar date). */
  startDate: Date;
  /** Inclusive end date (UTC midnight of that calendar date). */
  endDate: Date;
  reason?: string | null;
}

/** A generic closed-open time interval in absolute (UTC) time. */
export interface Interval {
  start: Date;
  end: Date;
}

export type BookingStatus = "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";

export interface AvailableSlot {
  start: Date;
  end: Date;
}

export const DEFAULT_SLOT_DURATION_MINUTES = 30;
export const DEFAULT_REMINDER_LEAD_MINUTES = 30;

/** Minimal shape of a booking needed for reminder-scheduling logic. */
export interface ReminderableBooking {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  /** Minutes before `startsAt` that a reminder should be sent for this booking. */
  reminderLeadMinutes: number;
}
