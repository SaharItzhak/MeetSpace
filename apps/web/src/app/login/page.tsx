import { signIn } from "@/auth";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back to MeetSpace.</p>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed. Please try again.
          </p>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
          className="mt-5"
        >
          <button type="submit" className="btn-secondary w-full">
            Continue with Google
          </button>
        </form>

        <div className="my-5 flex items-center gap-2 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or sign in with email
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/dashboard",
            });
          }}
          className="flex flex-col gap-3"
        >
          <input name="email" type="email" required placeholder="Email" className="input" />
          <input name="password" type="password" required placeholder="Password" className="input" />
          <button type="submit" className="btn-primary w-full">
            Sign in with email
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
