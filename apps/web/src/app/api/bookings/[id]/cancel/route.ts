import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/booking/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id }, include: { providerProfile: true } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const session = await auth();
  let cancelledBy: "provider" | "requester" | null = null;

  if (session?.user?.id === booking.providerProfile.userId) {
    cancelledBy = "provider";
  } else if (session?.user?.id && session.user.id === booking.requesterUserId) {
    cancelledBy = "requester";
  } else {
    // Guest requester path: prove ownership via the single-use cancel token emailed to them.
    const body = await request.json().catch(() => ({}));
    const token = (body as { cancelToken?: string }).cancelToken;
    if (token && token === booking.cancelToken) {
      cancelledBy = "requester";
    }
  }

  if (!cancelledBy) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await cancelBooking(id, cancelledBy);
  return NextResponse.json({ booking: updated });
}
