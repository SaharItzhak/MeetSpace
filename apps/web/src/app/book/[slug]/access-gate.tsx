"use client";

import { useCallback, useEffect, useState } from "react";
import BookingForm from "./booking-form";

type Status = "checking" | "NONE" | "PENDING" | "APPROVED" | "BLOCKED";

/** Gates the booking form behind the provider's approved-contacts list. Remembers the
 * email per-provider in localStorage so a returning visitor isn't asked twice. */
export default function AccessGate({
  providerSlug,
  accentColor,
}: {
  providerSlug: string;
  accentColor: string;
}) {
  const storageKey = `meetspace:access-email:${providerSlug}`;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("NONE");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (checkEmail: string) => {
      setEmail(checkEmail);
      setStatus("checking");
      setError(null);
      try {
        const res = await fetch(
          `/api/providers/${providerSlug}/contacts?email=${encodeURIComponent(checkEmail)}`
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not check access");
        setStatus(body.status);
        if (typeof window !== "undefined") window.localStorage.setItem(storageKey, checkEmail);
      } catch (e) {
        setStatus("NONE");
        setError(e instanceof Error ? e.message : "Could not check access");
      }
    },
    [providerSlug, storageKey]
  );

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (!saved) return;
    // Kicking off the initial access check on mount is the intended one-time sync with
    // localStorage; the lint rule can't see that checkStatus's setState calls are safe here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkStatus(saved);
  }, [checkStatus, storageKey]);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerSlug}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || email.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not request access");
      setStatus(body.status);
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request access");
    } finally {
      setRequesting(false);
    }
  }

  if (status === "APPROVED") {
    return <BookingForm providerSlug={providerSlug} accentColor={accentColor} requesterEmail={email} />;
  }

  return (
    <div className="card">
      {status === "PENDING" ? (
        <div>
          <span className="badge badge-pending">Pending approval</span>
          <p className="mt-3 text-sm text-slate-600">
            Your request is waiting on the provider&apos;s approval. You&apos;ll be able to book as
            soon as they approve you — check back later or watch your email.
          </p>
        </div>
      ) : status === "BLOCKED" ? (
        <div>
          <span className="badge badge-blocked">Access not available</span>
          <p className="mt-3 text-sm text-slate-600">
            This provider isn&apos;t accepting requests from this email address.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="font-semibold text-slate-900">Request access to book</h2>
          <p className="mt-1 text-sm text-slate-600">
            This provider only takes calls from people they&apos;ve approved. Enter your details and
            they&apos;ll review your request.
          </p>
          <form onSubmit={requestAccess} className="mt-4 flex flex-col gap-3">
            <input
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
            <input
              required
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <button
              type="submit"
              disabled={requesting || status === "checking"}
              className="btn-primary"
              style={{ backgroundColor: accentColor }}
            >
              {requesting ? "Sending..." : "Request access"}
            </button>
          </form>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
