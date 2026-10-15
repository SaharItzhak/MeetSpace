import { describe, expect, it } from "vitest";
import { computeDueReminders } from "./reminders.js";
import type { ReminderableBooking } from "./types.js";

const d = (iso: string) => new Date(iso);

function booking(overrides: Partial<ReminderableBooking> = {}): ReminderableBooking {
  return {
    id: "booking-1",
    status: "APPROVED",
    startsAt: d("2024-01-08T15:00:00Z"),
    reminderLeadMinutes: 30,
    ...overrides,
  };
}

describe("computeDueReminders", () => {
  it("is due once within the tolerance window before send time", () => {
    const result = computeDueReminders({
      bookings: [booking()],
      alreadySentBookingIds: [],
      now: d("2024-01-08T14:30:00Z"), // exactly at send time (30 min before start)
    });
    expect(result).toHaveLength(1);
    expect(result[0].bookingId).toBe("booking-1");
  });

  it("is not due too early", () => {
    const result = computeDueReminders({
      bookings: [booking()],
      alreadySentBookingIds: [],
      now: d("2024-01-08T14:00:00Z"), // 1 hour before start, lead is 30 min
    });
    expect(result).toHaveLength(0);
  });

  it("is not due once the booking has already started", () => {
    const result = computeDueReminders({
      bookings: [booking()],
      alreadySentBookingIds: [],
      now: d("2024-01-08T15:30:00Z"),
    });
    expect(result).toHaveLength(0);
  });

  it("is not re-sent if already recorded as sent (idempotency)", () => {
    const result = computeDueReminders({
      bookings: [booking()],
      alreadySentBookingIds: ["booking-1"],
      now: d("2024-01-08T14:30:00Z"),
    });
    expect(result).toHaveLength(0);
  });

  it("ignores non-approved bookings", () => {
    const result = computeDueReminders({
      bookings: [booking({ status: "PENDING" })],
      alreadySentBookingIds: [],
      now: d("2024-01-08T14:30:00Z"),
    });
    expect(result).toHaveLength(0);
  });

  it("respects a per-booking custom reminder lead time", () => {
    const result = computeDueReminders({
      bookings: [booking({ reminderLeadMinutes: 60 })],
      alreadySentBookingIds: [],
      now: d("2024-01-08T14:00:00Z"), // exactly 60 min before
    });
    expect(result).toHaveLength(1);
  });
});
