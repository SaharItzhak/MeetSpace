import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContactsTable from "./contacts-table";

export default async function ProviderContactsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!providerProfile) {
    redirect("/dashboard/provider");
  }

  const contacts = await prisma.providerContact.findMany({
    where: { providerProfileId: providerProfile.id },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard/provider" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Approved contacts</h1>
      <p className="mt-1 text-sm text-slate-600">
        {providerProfile.requireApproval
          ? "Only people listed here can request a call with you. Add someone by email to pre-approve them, or approve/block requests as they come in."
          : "Approval isn't required right now — anyone with your link can request a call. Turn on \u201cRequire approval\u201d in settings to restrict booking to this list."}
      </p>

      <div className="card mt-6 p-0">
        <ContactsTable
          initialContacts={contacts.map((c) => ({
            id: c.id,
            email: c.email,
            name: c.name,
            status: c.status,
            requestedAt: c.requestedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
