import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UsersTable from "./users-table";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      providerProfile: { select: { slug: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin · Users</h1>
      <p className="mt-1 text-sm text-slate-600">
        Promote/demote admins or remove accounts. You can&apos;t change your own admin access
        or delete your own account from here.
      </p>

      <div className="card mt-6 p-0">
        <UsersTable
          currentUserId={session.user.id}
          initialUsers={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            providerSlug: u.providerProfile?.slug ?? null,
          }))}
        />
      </div>
    </main>
  );
}
