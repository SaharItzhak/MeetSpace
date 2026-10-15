import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

/** Comma-separated emails (set via env, never in code) that get promoted to ADMIN the
 * moment they register. Lets the deployer bootstrap their own first admin account
 * without anyone else ever seeing or handling their password. */
function isBootstrapAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Email/password signup fallback for users who don't want to use Google OAuth. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: isBootstrapAdminEmail(email) ? "ADMIN" : "USER" },
  });

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
