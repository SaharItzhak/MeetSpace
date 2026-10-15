import { prisma } from "@/lib/prisma";
import type { ProviderProfile } from "@prisma/client";

/** Normalizes an email for consistent lookups (ProviderContact.email is stored lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns whether `email` may book with a provider that has `requireApproval` enabled.
 * Providers with requireApproval off always return true (anyone may book, same as v1).
 */
export async function canEmailBookProvider(
  providerProfile: Pick<ProviderProfile, "id" | "requireApproval">,
  email: string
): Promise<boolean> {
  if (!providerProfile.requireApproval) return true;
  const contact = await prisma.providerContact.findUnique({
    where: { providerProfileId_email: { providerProfileId: providerProfile.id, email: normalizeEmail(email) } },
  });
  return contact?.status === "APPROVED";
}

/** Looks up a contact's current access status for the public booking page's access gate. */
export async function getContactStatus(
  providerProfileId: string,
  email: string
): Promise<"NONE" | "PENDING" | "APPROVED" | "BLOCKED"> {
  const contact = await prisma.providerContact.findUnique({
    where: { providerProfileId_email: { providerProfileId, email: normalizeEmail(email) } },
  });
  return contact?.status ?? "NONE";
}

/**
 * Self-service "request access" — creates a PENDING contact if none exists yet. Already
 * APPROVED/PENDING contacts are left untouched; BLOCKED contacts stay blocked (a provider
 * has to manually unblock, so repeated requests can't be used to get around a block).
 */
export async function requestContactAccess(
  providerProfileId: string,
  { name, email }: { name: string; email: string }
) {
  const normalized = normalizeEmail(email);
  const existing = await prisma.providerContact.findUnique({
    where: { providerProfileId_email: { providerProfileId, email: normalized } },
  });
  if (existing) return existing;
  return prisma.providerContact.create({
    data: { providerProfileId, email: normalized, name },
  });
}
