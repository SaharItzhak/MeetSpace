import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "./availability.js";

const d = (iso: string) => new Date(iso);

describe("computeAvailableSlots", () => {
  const timezone = "America/New_York"; // UTC-5 in January (no DST)

  it("generates slots for a simple weekly rule with no conflicts", () => {
    const slots = computeAvailableSlots({
      weeklyRules: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }], // Monday 9-11am
      timezone,
      blackoutDates: [],
      busyIntervals: [],
      slotDurationMinutes: 30,
      rangeStart: d("2024-01-08T00:00:00Z"), // Monday Jan 8, 2024
      rangeEnd: d("2024-01-09T00:00:00Z"),
      now: d("2023-12-01T00:00:00Z"),
      minNoticeMinutes: 0,
    });

    // 9am-11am Eastern = 14:00-16:00 UTC, in 30 minute increments = 4 slots.
    expect(slots).toHaveLength(4);
    expect(slots[0].start.toISOString()).toBe("2024-01-08T14:00:00.000Z");
    expect(slots[3].end.toISOString()).toBe("2024-01-08T16:00:00.000Z");
  });

  it("excludes days inside a blackout range", () => {
    const slots = computeAvailableSlots({
      weeklyRules: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }],
      timezone,
      blackoutDates: [
        { startDate: d("2024-01-08T00:00:00Z"), endDate: d("2024-01-08T00:00:00Z") },
      ],
      busyIntervals: [],
      slotDurationMinutes: 30,
      rangeStart: d("2024-01-08T00:00:00Z"),
      rangeEnd: d("2024-01-09T00:00:00Z"),
      now: d("2023-12-01T00:00:00Z"),
      minNoticeMinutes: 0,
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots that overlap a busy interval from the real calendar", () => {
    const slots = computeAvailableSlots({
      weeklyRules: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }],
      timezone,
      blackoutDates: [],
      busyIntervals: [{ start: d("2024-01-08T14:00:00Z"), end: d("2024-01-08T14:30:00Z") }],
      slotDurationMinutes: 30,
      rangeStart: d("2024-01-08T00:00:00Z"),
      rangeEnd: d("2024-01-09T00:00:00Z"),
      now: d("2023-12-01T00:00:00Z"),
      minNoticeMinutes: 0,
    });
    expect(slots).toHaveLength(3);
    expect(slots[0].start.toISOString()).toBe("2024-01-08T14:30:00.000Z");
  });

  it("excludes slots that start sooner than the minimum notice window", () => {
    const slots = computeAvailableSlots({
      weeklyRules: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }],
      timezone,
      blackoutDates: [],
      busyIntervals: [],
      slotDurationMinutes: 30,
      rangeStart: d("2024-01-08T00:00:00Z"),
      rangeEnd: d("2024-01-09T00:00:00Z"),
      now: d("2024-01-08T13:45:00Z"), // 15 min before the first slot
      minNoticeMinutes: 60,
    });
    // First slot (14:00 UTC) is only 15 min away, too soon; next slot (14:30) is 45 min away, still too soon;
    // slot at 15:00 is 75 min away -> allowed.
    expect(slots[0].start.toISOString()).toBe("2024-01-08T15:00:00.000Z");
  });

  it("returns no slots on days with no matching weekly rule", () => {
    const slots = computeAvailableSlots({
      weeklyRules: [{ dayOfWeek: 2, startMinute: 9 * 60, endMinute: 11 * 60 }], // Tuesday only
      timezone,
      blackoutDates: [],
      busyIntervals: [],
      slotDurationMinutes: 30,
      rangeStart: d("2024-01-08T00:00:00Z"), // Monday
      rangeEnd: d("2024-01-09T00:00:00Z"),
      now: d("2023-12-01T00:00:00Z"),
      minNoticeMinutes: 0,
    });
    expect(slots).toHaveLength(0);
  });
});
