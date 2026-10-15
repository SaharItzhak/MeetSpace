import Link from "next/link";
import { auth, signOut } from "@/auth";

/** Persistent top nav: logo/home link, and session-aware sign in/out + dashboard link. */
export default async function SiteHeader() {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            MS
          </span>
          MeetSpace
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="font-medium text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="font-medium text-slate-600 hover:text-slate-900">
                  Admin
                </Link>
              )}
              <form action={signOutAction}>
                <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary px-3.5 py-1.5 text-xs">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
