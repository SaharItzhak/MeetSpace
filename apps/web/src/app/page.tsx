import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">MeetSpace</h1>
      <p className="text-lg text-slate-600">
        Share a booking link, let people grab an open call slot, and get a real Google
        Calendar invite with a phone number and a free video call link — automatically.
      </p>
      <div className="flex justify-center gap-3">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
