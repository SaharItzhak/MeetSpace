import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createBookingRequestSchema } from "@meetspace/shared";
import { createBookingRequest } from "@/lib/booking/service";
import { canEmailBookProvider } from "@/lib/contacts";

/** Public endpoint: a requester (signed in or not) submits a booking request for an open slot. */
export async function POST(request: Request) {
  const parsed = createBookingRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { providerSlug, slotStart, slotEnd, requesterName, requesterEmail, requesterPhone, note } =
    parsed.data;

  const providerProfile = await prisma.providerProfile.findUnique({ where: { slug: providerSlug } });
  if (!providerProfile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  if (slotEnd.getTime() <= slotStart.getTime() || slotStart.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invalid slot time" }, { status: 400 });
  }

  // Enforced server-side (not just hidden in the UI): if the provider requires
  // approval, only an email the provider has approved may create a booking.
  if (!(await canEmailBookProvider(providerProfile, requesterEmail))) {
    return NextResponse.json(
      { error: "You need the provider's approval before you can book. Request access first." },
      { status: 403 }
    );
  }

  // Re-check the slot isn't already taken by a pending/approved booking (best-effort
  // race protection; the unique-ish check below is not a hard DB constraint in v1).
  const conflict = await prisma.booking.findFirst({
    where: {
      providerProfileId: providerProfile.id,
      status: { in: ["PENDING", "APPROVED"] },
      startsAt: { lt: slotEnd },
      endsAt: { gt: slotStart },
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });
  }

  const session = await auth();
  const booking = await createBookingRequest({
    providerProfile,
    slotStart,
    slotEnd,
    requesterUserId: session?.user?.id ?? null,
    requesterName,
    requesterEmail,
    requesterPhone,
    note,
  });

  return NextResponse.json({ booking: { id: booking.id, cancelToken: booking.cancelToken } });
}
