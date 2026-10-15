import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { providerSettingsSchema } from "@meetspace/shared";

/**
 * Lets a signed-in user opt in to being a Provider: creates their `ProviderProfile`.
 * The actual Google Calendar OAuth consent (incremental scope) happens client-side via
 * the "Connect Google Calendar" button, which re-runs `signIn("google", ...)` with the
 * calendar scope — this route just persists the provider's chosen settings.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = providerSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingSlug = await prisma.providerProfile.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug && existingSlug.userId !== session.user.id) {
    return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
  }

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: { ...parsed.data },
  });

  return NextResponse.json({ providerProfile });
}
