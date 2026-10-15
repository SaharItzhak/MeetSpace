import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlotsForProvider } from "@/lib/booking/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const providerProfile = await prisma.providerProfile.findUnique({ where: { slug } });
  if (!providerProfile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const slots = await getAvailableSlotsForProvider(providerProfile);
  return NextResponse.json({
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
