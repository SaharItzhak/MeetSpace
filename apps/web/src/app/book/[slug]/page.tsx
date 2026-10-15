import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingForm from "./booking-form";
import AccessGate from "./access-gate";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const providerProfile = await prisma.providerProfile.findUnique({ where: { slug } });
  if (!providerProfile) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div
        className="h-1.5 w-16 rounded-full"
        style={{ backgroundColor: providerProfile.accentColor }}
      />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        {providerProfile.displayName}
      </h1>
      {providerProfile.bio ? <p className="mt-2 text-slate-600">{providerProfile.bio}</p> : null}
      <p className="mt-1 text-sm text-slate-500">Timezone: {providerProfile.timezone}</p>
      {providerProfile.welcomeMessage ? (
        <p className="card mt-4 text-sm text-slate-700">{providerProfile.welcomeMessage}</p>
      ) : null}

      <div className="mt-8">
        {providerProfile.requireApproval ? (
          <AccessGate providerSlug={providerProfile.slug} accentColor={providerProfile.accentColor} />
        ) : (
          <BookingForm providerSlug={providerProfile.slug} accentColor={providerProfile.accentColor} />
        )}
      </div>
    </main>
  );
}
