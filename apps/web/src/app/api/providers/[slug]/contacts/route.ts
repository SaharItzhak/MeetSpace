import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestContactAccessSchema } from "@meetspace/shared";
import { getContactStatus, requestContactAccess } from "@/lib/contacts";

/** Public: checks whether an email has (or has requested) access to book this provider. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email query param is required" }, { status: 400 });
  }

  const providerProfile = await prisma.providerProfile.findUnique({ where: { slug } });
  if (!providerProfile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  if (!providerProfile.requireApproval) {
    return NextResponse.json({ status: "APPROVED" });
  }

  const status = await getContactStatus(providerProfile.id, email);
  return NextResponse.json({ status });
}

/** Public: submits a self-service "request access" for this provider's approved-requesters list. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = requestContactAccessSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const providerProfile = await prisma.providerProfile.findUnique({ where: { slug } });
  if (!providerProfile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const contact = await requestContactAccess(providerProfile.id, parsed.data);
  return NextResponse.json({ status: contact.status });
}
