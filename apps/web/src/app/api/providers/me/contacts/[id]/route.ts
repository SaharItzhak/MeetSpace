import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateContactStatusSchema } from "@meetspace/shared";

async function requireOwnedContact(userId: string, contactId: string) {
  const contact = await prisma.providerContact.findUnique({
    where: { id: contactId },
    include: { providerProfile: true },
  });
  if (!contact || contact.providerProfile.userId !== userId) return null;
  return contact;
}

/** Approves, blocks, or resets a contact's access status. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  const contact = await requireOwnedContact(session.user.id, id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const parsed = updateContactStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.providerContact.update({
    where: { id },
    data: { status: parsed.data.status, decidedAt: new Date() },
  });
  return NextResponse.json({ contact: updated });
}

/** Removes a contact entirely (they'd need to request access again, or be re-added). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  const contact = await requireOwnedContact(session.user.id, id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.providerContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
