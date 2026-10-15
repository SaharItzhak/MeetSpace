import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveBooking, declineBooking, cancelBooking } from "@/lib/booking/service";

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

  async function approveAction(formData: FormData) {
    "use server";
    await approveBooking(String(formData.get("bookingId")));
  }
  async function declineAction(formData: FormData) {
    "use server";
    await declineBooking(String(formData.get("bookingId")));
  }
  async function cancelAsProviderAction(formData: FormData) {
    "use server";
    await cancelBooking(String(formData.get("bookingId")), "provider");
  }
  async function cancelAsRequesterAction(formData: FormData) {
    "use server";
    await cancelBooking(String(formData.get("bookingId")), "requester");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Provider</h2>
        {providerProfile ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600">
              Your public booking page:{" "}
              <Link href={`/book/${providerProfile.slug}`} className="underline">
                /book/{providerProfile.slug}
              </Link>
            </p>
            <Link href="/dashboard/provider" className="text-sm underline">
              Edit availability &amp; settings
            </Link>

            <h3 className="mt-6 font-medium">Pending requests</h3>
            <ul className="mt-2 space-y-3">
              {providerProfile.bookings
                .filter((b) => b.status === "PENDING")
                .map((b) => (
                  <li key={b.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p>
                      <strong>{b.requesterName}</strong> ({b.requesterEmail}, {b.requesterPhone}) —{" "}
                      {b.startsAt.toLocaleString()}
                    </p>
                    {b.note ? <p className="mt-1 text-slate-600">Note: {b.note}</p> : null}
                    <div className="mt-2 flex gap-2">
                      <form action={approveAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                          Approve
                        </button>
                      </form>
                      <form action={declineAction}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium">
                          Decline
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              {providerProfile.bookings.filter((b) => b.status === "PENDING").length === 0 ? (
                <li className="text-sm text-slate-500">No pending requests.</li>
              ) : null}
            </ul>

            <h3 className="mt-6 font-medium">Upcoming approved calls</h3>
            <ul className="mt-2 space-y-3">
              {providerProfile.bookings
                .filter((b) => b.status === "APPROVED")
                .map((b) => (
                  <li key={b.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p>
                      <strong>{b.requesterName}</strong> — {b.startsAt.toLocaleString()}
                    </p>
                    <p className="text-slate-600">
                      Phone: {b.requesterPhone} · Video:{" "}
                      <a href={b.videoCallUrl} className="underline">
                        {b.videoCallUrl}
                      </a>
                    </p>
                    <form action={cancelAsProviderAction} className="mt-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                        Cancel
                      </button>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-600">
              Want to let people book calls with you? Set up your public booking page.
            </p>
            <Link
              href="/dashboard/provider"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Become a provider
            </Link>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Your call requests</h2>
        <ul className="mt-3 space-y-3">
          {myBookingsAsRequester.map((b) => (
            <li key={b.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <p>
                With {b.providerProfile.displayName} — {b.startsAt.toLocaleString()} ·{" "}
                <span className="font-medium">{b.status}</span>
              </p>
              {b.status === "APPROVED" || b.status === "PENDING" ? (
                <form action={cancelAsRequesterAction} className="mt-2">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                    Cancel
                  </button>
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
