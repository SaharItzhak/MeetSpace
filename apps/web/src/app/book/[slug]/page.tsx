import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingForm from "./booking-form";

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
      <h1 className="text-2xl font-semibold">{providerProfile.displayName}</h1>
      {providerProfile.bio ? <p className="mt-2 text-slate-600">{providerProfile.bio}</p> : null}
      <p className="mt-1 text-sm text-slate-500">Timezone: {providerProfile.timezone}</p>

      <div className="mt-8">
        <BookingForm providerSlug={providerProfile.slug} />
      </div>
    </main>
  );
}
