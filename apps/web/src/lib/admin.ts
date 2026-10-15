import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/** Resolves the signed-in session and ensures it's an admin. Returns a ready-to-return
 * NextResponse in `response` when the caller should reject the request (401/403), or
 * the verified admin session in `session` when the request may proceed. */
export async function requireAdmin(): Promise<
  { session: Session; response: null } | { session: null; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null, response: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { session, response: null };
}
