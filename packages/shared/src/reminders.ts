import type { ReminderableBooking } from "./types.js";

export interface DueReminder {
  bookingId: string;
  startsAt: Date;
  sendAt: Date;
}

export interface ComputeDueRemindersParams {
  bookings: ReminderableBooking[];
  /** Booking IDs for which a reminder has already been recorded as sent. */
  alreadySentBookingIds: Set<string> | string[];
  now: Date;
  /**
   * How early (in minutes) the cron is allowed to fire a reminder relative to its
   * exact due time, to tolerate the ~5 minute polling cadence. Default 1 minute.
   */
  earlyToleranceMinutes?: number;
}

/**
 * Pure function used by both the cron API route and its unit tests: given a set of
 * approved bookings and which reminders were already recorded as sent, returns the
 * reminders that are now due. Idempotency is the caller's responsibility (it must
 * persist a "sent" record per booking before/while emailing so re-running the scan
 * doesn't double-send) — this function only decides *what* is due right now.
 */
export function computeDueReminders(params: ComputeDueRemindersParams): DueReminder[] {
  const { bookings, now, earlyToleranceMinutes = 1 } = params;
  const alreadySent =
    params.alreadySentBookingIds instanceof Set
      ? params.alreadySentBookingIds
      : new Set(params.alreadySentBookingIds);

  const due: DueReminder[] = [];
  for (const booking of bookings) {
    if (booking.status !== "APPROVED") continue;
    if (alreadySent.has(booking.id)) continue;

    const sendAt = new Date(booking.startsAt.getTime() - booking.reminderLeadMinutes * 60_000);
    const earliestFireable = new Date(sendAt.getTime() - earlyToleranceMinutes * 60_000);

    // Only fire once the booking's start time is still in the future (no point
    // reminding about a call that already started) and we've reached the send window.
    if (now.getTime() >= earliestFireable.getTime() && now.getTime() < booking.startsAt.getTime()) {
      due.push({ bookingId: booking.id, startsAt: booking.startsAt, sendAt });
    }
  }
  return due;
}
