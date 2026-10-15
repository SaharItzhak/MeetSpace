import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { blackoutDateSchema, weeklyAvailabilityRuleSchema } from "@meetspace/shared";
import { z } from "zod";

const bodySchema = z.object({
  weeklyRules: z.array(weeklyAvailabilityRuleSchema),
  blackoutDates: z.array(blackoutDateSchema),
});

/** Returns the current user's weekly availability rules + blackout dates. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: { weeklyRules: true, blackoutDates: true },
  });
  if (!providerProfile) {
    return NextResponse.json({ error: "Not a provider yet" }, { status: 404 });
  }
  return NextResponse.json({
    weeklyRules: providerProfile.weeklyRules,
    blackoutDates: providerProfile.blackoutDates,
  });
}

/** Replaces the current user's weekly availability rules + blackout dates wholesale. */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const providerProfile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
  if (!providerProfile) {
    return NextResponse.json({ error: "Not a provider yet" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.weeklyAvailabilityRule.deleteMany({ where: { providerProfileId: providerProfile.id } }),
    prisma.blackoutDate.deleteMany({ where: { providerProfileId: providerProfile.id } }),
    prisma.weeklyAvailabilityRule.createMany({
      data: parsed.data.weeklyRules.map((r) => ({ ...r, providerProfileId: providerProfile.id })),
    }),
    prisma.blackoutDate.createMany({
      data: parsed.data.blackoutDates.map((b) => ({ ...b, providerProfileId: providerProfile.id })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
