import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/** Lists every user account for the admin users table. Never returns passwordHash. */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      providerProfile: { select: { slug: true } },
      _count: { select: { bookingsAsUser: true } },
    },
  });
  return NextResponse.json({ users });
}
