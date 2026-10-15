import { prisma } from "@/lib/prisma";
import { getCalendarProviderForUser } from "@/lib/calendar";
import { getEmailProvider, emailTemplate } from "@/lib/email";
import {
  buildEventDescription,
  computeAvailableSlots,
  generateJitsiRoomId,
  jitsiRoomUrl,
  type AvailableSlot,
} from "@meetspace/shared";
import type { ProviderProfile } from "@prisma/client";

/** Computes the open, bookable slots for a provider's public booking page. */
export async function getAvailableSlotsForProvider(
  providerProfile: ProviderProfile
): Promise<AvailableSlot[]> {
  const [weeklyRules, blackoutDates] = await Promise.all([
    prisma.weeklyAvailabilityRule.findMany({ where: { providerProfileId: providerProfile.id } }),
    prisma.blackoutDate.findMany({ where: { providerProfileId: providerProfile.id } }),
  ]);

  const rangeStart = new Date();
  const rangeEnd = new Date(
    rangeStart.getTime() + providerProfile.maxAdvanceDays * 24 * 60 * 60 * 1000
  );
  const bufferMs = providerProfile.bufferMinutes * 60_000;

  let busyIntervals: { start: Date; end: Date }[] = [];
  try {
    const calendar = await getCalendarProviderForUser(providerProfile.userId);
    const freeBusy = await calendar.freeBusy({
      calendarId: providerProfile.googleCalendarId,
      timeMin: rangeStart,
      timeMax: rangeEnd,
    });
    busyIntervals = freeBusy.busy;
  } catch {
    // Provider hasn't connected (or has disconnected) Google Calendar yet. We still show
    // slots based on their weekly rules/blackouts alone rather than hard-failing the page,
    // since real-calendar conflicts just won't be filtered out in that case.
    busyIntervals = [];
  }

  // Also exclude slots already covered by our own pending/approved bookings so two
  // requesters can't simultaneously be offered (and both request) the exact same slot
  // before a Google Calendar event exists for the first one.
  const existingBookings = await prisma.booking.findMany({
    where: {
      providerProfileId: providerProfile.id,
      status: { in: ["PENDING", "APPROVED"] },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { startsAt: true, endsAt: true },
  });
  busyIntervals = busyIntervals.concat(
    existingBookings.map((b) => ({ start: b.startsAt, end: b.endsAt }))
  );

  // Pad every busy interval by the provider's configured buffer so back-to-back calls
  // always leave breathing room, instead of only preventing exact overlaps.
  if (bufferMs > 0) {
    busyIntervals = busyIntervals.map((interval) => ({
      start: new Date(interval.start.getTime() - bufferMs),
      end: new Date(interval.end.getTime() + bufferMs),
    }));
  }

  return computeAvailableSlots({
    weeklyRules: weeklyRules.map((r) => ({
      dayOfWeek: r.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
    })),
    timezone: providerProfile.timezone,
    blackoutDates,
    busyIntervals,
    slotDurationMinutes: providerProfile.slotDurationMinutes,
    rangeStart,
    rangeEnd,
    minNoticeMinutes: providerProfile.minNoticeMinutes,
  });
}

export interface CreateBookingParams {
  providerProfile: ProviderProfile;
  slotStart: Date;
  slotEnd: Date;
  requesterUserId?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  note?: string;
}

/** Creates a pending booking request. No calendar event is created until the provider approves. */
export async function createBookingRequest(params: CreateBookingParams) {
  const roomId = generateJitsiRoomId();
  return prisma.booking.create({
    data: {
      providerProfileId: params.providerProfile.id,
      requesterUserId: params.requesterUserId ?? null,
      requesterName: params.requesterName,
      requesterEmail: params.requesterEmail,
      requesterPhone: params.requesterPhone,
      note: params.note,
      startsAt: params.slotStart,
      endsAt: params.slotEnd,
      status: "PENDING",
      reminderLeadMinutes: params.providerProfile.defaultReminderLeadMinutes,
      videoCallUrl: jitsiRoomUrl(roomId),
    },
  });
}

/** Approves a pending booking: creates the Google Calendar event (with attendee + sendUpdates=all). */
export async function approveBooking(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { providerProfile: { include: { user: true } } },
  });
  if (booking.status !== "PENDING") {
    throw new Error(`Booking ${bookingId} is not pending (status: ${booking.status})`);
  }

  const calendar = await getCalendarProviderForUser(booking.providerProfile.userId);
  const description = buildEventDescription({
    requesterPhone: booking.requesterPhone,
    videoCallUrl: booking.videoCallUrl,
    note: booking.note,
  });

  const event = await calendar.createEvent({
    calendarId: booking.providerProfile.googleCalendarId,
    title: `Call with ${booking.requesterName}`,
    description,
    start: booking.startsAt,
    end: booking.endsAt,
    attendeeEmails: [booking.requesterEmail],
    timezone: booking.providerProfile.timezone,
  });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "APPROVED", externalEventId: event.externalEventId },
  });

  const email = getEmailProvider();
  const { html, text } = emailTemplate({
    title: "Your call request was approved!",
    bodyLines: [
      `Your call with ${booking.providerProfile.displayName} is confirmed for ${booking.startsAt.toLocaleString()}.`,
      `Video call link (no app needed): ${booking.videoCallUrl}`,
      "A calendar invite has also been sent to your email.",
    ],
  });
  await email.send({ to: booking.requesterEmail, subject: "Call request approved", html, text });

  return updated;
}

/** Declines a pending booking and notifies the requester by email. */
export async function declineBooking(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { providerProfile: true },
  });
  if (booking.status !== "PENDING") {
    throw new Error(`Booking ${bookingId} is not pending (status: ${booking.status})`);
  }
  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: "DECLINED" } });

  const email = getEmailProvider();
  const { html, text } = emailTemplate({
    title: "Your call request was declined",
    bodyLines: [
      `Unfortunately ${booking.providerProfile.displayName} declined your request for ${booking.startsAt.toLocaleString()}.`,
      "Feel free to pick another open slot on their booking page.",
    ],
  });
  await email.send({ to: booking.requesterEmail, subject: "Call request declined", html, text });

  return updated;
}

/**
 * Cancels a booking (pending or approved) on behalf of either party. If it was approved,
 * also deletes the Google Calendar event and emails the other party.
 */
export async function cancelBooking(bookingId: string, cancelledBy: "provider" | "requester") {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { providerProfile: { include: { user: true } } },
  });
  if (booking.status === "CANCELLED") {
    return booking;
  }

  if (booking.status === "APPROVED" && booking.externalEventId) {
    const calendar = await getCalendarProviderForUser(booking.providerProfile.userId);
    await calendar.cancelEvent({
      calendarId: booking.providerProfile.googleCalendarId,
      externalEventId: booking.externalEventId,
    });
  }

  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });

  const email = getEmailProvider();
  if (cancelledBy === "provider") {
    const { html, text } = emailTemplate({
      title: "Your call was cancelled",
      bodyLines: [
        `${booking.providerProfile.displayName} cancelled your call scheduled for ${booking.startsAt.toLocaleString()}.`,
      ],
    });
    await email.send({ to: booking.requesterEmail, subject: "Call cancelled", html, text });
  } else if (booking.providerProfile.user.email) {
    const { html, text } = emailTemplate({
      title: "A call was cancelled",
      bodyLines: [
        `${booking.requesterName} cancelled their call scheduled for ${booking.startsAt.toLocaleString()}.`,
      ],
    });
    await email.send({
      to: booking.providerProfile.user.email,
      subject: "Call cancelled",
      html,
      text,
    });
  }

  return updated;
}
