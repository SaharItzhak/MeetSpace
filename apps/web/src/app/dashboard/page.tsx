import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveBooking, declineBooking, cancelBooking } from "@/lib/booking/service";
import CopyLinkButton from "./copy-link-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      bookings: { orderBy: { startsAt: "asc" } },
    },
  });

  const myBookingsAsRequester = await prisma.booking.findMany({
    where: {
      OR: [{ requesterUserId: userId }, { requesterEmail: session.user.email ?? "__none__" }],
    },
    include: { providerProfile: true },
    orderBy: { startsAt: "asc" },
  });

  // Each action mutates booking state shown on this very page. Server Actions don't
  // automatically invalidate the client Router Cache unless told to, so without this
  // the dashboard can keep rendering pre-mutation data after the form submits.
  async function approveAction(formData: FormData) {
    "use server";
    await approveBooking(String(formData.get("bookingId")));
    revalidatePath("/dashboard");
  }
  async function declineAction(formData: FormData) {
    "use server";
    await declineBooking(String(formData.get("bookingId")));
    revalidatePath("/dashboard");
  }
  async function cancelAsProviderAction(formData: FormData) {
    "use server";
    await cancelBooking(String(formData.get("bookingId")), "provider");
    revalidatePath("/dashboard");
  }
  async function cancelAsRequesterAction(formData: FormData) {
    "use server";
    await cancelBooking(String(formData.get("bookingId")), "requester");
    revalidatePath("/dashboard");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Provider</h2>
        {providerProfile ? (
          <div className="card mt-3 space-y-4">
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              Your public booking page:{" "}
              <Link href={`/book/${providerProfile.slug}`} className="font-medium text-indigo-600 hover:underline">
                /book/{providerProfile.slug}
              </Link>
              <CopyLinkButton path={`/book/${providerProfile.slug}`} />
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/dashboard/provider" className="font-medium text-indigo-600 hover:underline">
                Edit availability &amp; settings
              </Link>
              {providerProfile.requireApproval && (
                <Link href="/dashboard/provider/contacts" className="font-medium text-indigo-600 hover:underline">
                  Manage approved contacts
                </Link>
              )}
            </div>

            <h3 className="mt-6 font-medium text-slate-900">Pending requests</h3>
            <ul className="mt-2 space-y-3">
              {providerProfile.bookings
                .filter((b) => b.status === "PENDING")
                .map((b) => (
                  <li key={b.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <p>
                      <strong>{b.requesterName}</strong> ({b.requesterEmail}, {b.requesterPhone}) —{" "}
                      {b.startsAt.toLocaleString()}
                    </p>
                    {b.note ? <p className="mt-1 text-slate-600">Note: {b.note}</p> : null}
                    <div className="mt-2 flex gap-2">
                      <form action={approveAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="btn-primary px-3 py-1.5 text-xs">Approve</button>
                      </form>
                      <form action={declineAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="btn-secondary px-3 py-1.5 text-xs">Decline</button>
                      </form>
                    </div>
                  </li>
                ))}
              {providerProfile.bookings.filter((b) => b.status === "PENDING").length === 0 ? (
                <li className="text-sm text-slate-500">No pending requests.</li>
              ) : null}
            </ul>

            <h3 className="mt-6 font-medium text-slate-900">Upcoming approved calls</h3>
            <ul className="mt-2 space-y-3">
              {providerProfile.bookings
                .filter((b) => b.status === "APPROVED")
                .map((b) => (
                  <li key={b.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <p>
                      <strong>{b.requesterName}</strong> — {b.startsAt.toLocaleString()}
                    </p>
                    <p className="text-slate-600">
                      Phone: {b.requesterPhone} · Video:{" "}
                      <a href={b.videoCallUrl} className="text-indigo-600 hover:underline">
                        {b.videoCallUrl}
                      </a>
                    </p>
                    <form action={cancelAsProviderAction} className="mt-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="btn-danger">Cancel</button>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        ) : (
          <div className="card mt-3">
            <p className="text-sm text-slate-600">
              Want to let people book calls with you? Set up your public booking page.
            </p>
            <Link href="/dashboard/provider" className="btn-primary mt-3 inline-flex">
              Become a provider
            </Link>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Your call requests</h2>
        <ul className="mt-3 space-y-3">
          {myBookingsAsRequester.map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>
                With {b.providerProfile.displayName} — {b.startsAt.toLocaleString()}
              </p>
              <span
                className={`badge badge-${b.status.toLowerCase()}`}
              >
                {b.status}
              </span>
              {b.status === "APPROVED" || b.status === "PENDING" ? (
                <form action={cancelAsRequesterAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="btn-danger">Cancel</button>
                </form>
              ) : null}
            </li>
          ))}
          {myBookingsAsRequester.length === 0 ? (
            <li className="text-sm text-slate-500">No call requests yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
