import Link from "next/link";
import { auth } from "@/auth";

const FEATURES = [
  {
    title: "Real calendar sync",
    body: "Approved calls create real Google Calendar events on both sides — invite, reminder, and all.",
  },
  {
    title: "Approval built in",
    body: "Nothing hits your calendar until you approve it. Decline without ever being bothered.",
  },
  {
    title: "Private by invitation",
    body: "Optionally restrict who can even request a call — perfect for a trusted group like parents in a class.",
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)",
          }}
        />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center">
          <span className="badge badge-admin">v1 · free &amp; open</span>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">MeetSpace</h1>
          <p className="max-w-xl text-lg text-slate-600">
            Share a booking link, let people grab an open call slot, and get a real Google
            Calendar invite with a phone number and a free video call link — automatically.
          </p>
          <div className="flex justify-center gap-3">
            {session?.user ? (
              <Link href="/dashboard" className="btn-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary">
                  Create account
                </Link>
                <Link href="/login" className="btn-secondary">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="card">
            <h2 className="font-semibold text-slate-900">{feature.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
