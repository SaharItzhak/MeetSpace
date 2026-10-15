import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireProviderProfile(userId: string) {
  return prisma.providerProfile.findUnique({ where: { userId } });
}

/** Lists everyone who has requested or been granted access to book with the signed-in provider. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const providerProfile = await requireProviderProfile(session.user.id);
  if (!providerProfile) {
    return NextResponse.json({ error: "You're not a provider yet" }, { status: 403 });
  }

  const contacts = await prisma.providerContact.findMany({
    where: { providerProfileId: providerProfile.id },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json({ contacts });
}

const addContactSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
});

/** Lets a provider directly pre-approve someone (e.g. invite a known parent) without
 * waiting for a self-service request. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const providerProfile = await requireProviderProfile(session.user.id);
  if (!providerProfile) {
    return NextResponse.json({ error: "You're not a provider yet" }, { status: 403 });
  }

  const parsed = addContactSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const contact = await prisma.providerContact.upsert({
    where: { providerProfileId_email: { providerProfileId: providerProfile.id, email } },
    create: {
      providerProfileId: providerProfile.id,
      email,
      name: parsed.data.name,
      status: "APPROVED",
      decidedAt: new Date(),
    },
    update: { status: "APPROVED", decidedAt: new Date() },
  });
  return NextResponse.json({ contact });
}
