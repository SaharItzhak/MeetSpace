import { prisma } from "@/lib/prisma";
import { getEmailProvider, emailTemplate } from "@/lib/email";
import { computeDueReminders, type ReminderableBooking } from "@meetspace/shared";

/**
 * Scans approved, upcoming bookings and sends any reminder emails that are now due,
 * recording each send in `ReminderLog` first so the ~5-minute GitHub Actions poll never
 * double-sends (the unique constraint on `ReminderLog.bookingId` enforces this even
 * under concurrent invocations).
 */
export async function sendDueReminders(now: Date = new Date()): Promise<{ sent: number }> {
  // Only pull bookings starting within the next day — plenty of margin over any
  // realistic reminder lead time, keeps the scan cheap.
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidates = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      startsAt: { gte: now, lte: windowEnd },
      reminder: null,
    },
    include: { providerProfile: true },
  });

  const reminderable: ReminderableBooking[] = candidates.map((b) => ({
    id: b.id,
    status: b.status,
    startsAt: b.startsAt,
    reminderLeadMinutes: b.reminderLeadMinutes,
  }));

  const due = computeDueReminders({ bookings: reminderable, alreadySentBookingIds: [], now });
  const byId = new Map(candidates.map((b) => [b.id, b]));
  const email = getEmailProvider();

  let sent = 0;
  for (const reminder of due) {
    const booking = byId.get(reminder.bookingId);
    if (!booking) continue;

    // Claim this reminder first via the unique constraint; if another concurrent run
    // already claimed it, this throws and we simply skip sending (idempotency).
    try {
      await prisma.reminderLog.create({ data: { bookingId: booking.id } });
    } catch {
      continue;
    }

    const { html, text } = emailTemplate({
      title: "Reminder: upcoming call",
      bodyLines: [
        `Your call with ${booking.providerProfile.displayName} starts at ${booking.startsAt.toLocaleString()}.`,
        `Video call link: ${booking.videoCallUrl}`,
        `Or call: ${booking.requesterPhone}`,
      ],
    });
    await email.send({ to: booking.requesterEmail, subject: "Reminder: your call is coming up", html, text });
    sent += 1;
  }

  return { sent };
}
