import { redirect } from "next/navigation";
import { auth, signIn, GOOGLE_CALENDAR_SCOPE } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProviderSettingsForm from "./settings-form";

export default async function ProviderDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: { weeklyRules: true, blackoutDates: true },
  });

  const googleAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });
  const hasCalendarScope = Boolean(googleAccount?.scope?.includes("calendar"));

  async function connectGoogleCalendarAction() {
    "use server";
    await signIn("google", {
      redirectTo: "/dashboard/provider",
      authorizationParams: { scope: GOOGLE_CALENDAR_SCOPE },
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Provider settings</h1>

      <section className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="font-medium">Google Calendar</h2>
        <p className="mt-1 text-sm text-slate-600">
          {hasCalendarScope
            ? "Connected. Your real busy times are checked and approved bookings create calendar invites."
            : "Not connected yet. Connect so busy times are respected and approvals create calendar invites."}
        </p>
        {!hasCalendarScope && (
          <form action={connectGoogleCalendarAction} className="mt-3">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Connect Google Calendar
            </button>
          </form>
        )}
      </section>

      <section className="mt-6">
        <ProviderSettingsForm
          initialSettings={
            providerProfile
              ? {
                  slug: providerProfile.slug,
                  displayName: providerProfile.displayName,
                  timezone: providerProfile.timezone,
                  slotDurationMinutes: providerProfile.slotDurationMinutes,
                  defaultReminderLeadMinutes: providerProfile.defaultReminderLeadMinutes,
                  bio: providerProfile.bio ?? "",
                }
              : null
          }
          initialWeeklyRules={providerProfile?.weeklyRules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startMinute: r.startMinute,
            endMinute: r.endMinute,
          })) ?? []}
          initialBlackoutDates={providerProfile?.blackoutDates.map((b) => ({
            startDate: b.startDate.toISOString().slice(0, 10),
            endDate: b.endDate.toISOString().slice(0, 10),
            reason: b.reason ?? "",
          })) ?? []}
        />
      </section>
    </main>
  );
}
