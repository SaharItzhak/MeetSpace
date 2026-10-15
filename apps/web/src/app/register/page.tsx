"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not create account");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Takes less than a minute.</p>
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <input name="name" required placeholder="Name" className="input" />
          <input name="email" type="email" required placeholder="Email" className="input" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            className="input"
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
