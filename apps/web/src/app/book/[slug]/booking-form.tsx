"use client";

import { useEffect, useState } from "react";

interface Slot {
  start: string;
  end: string;
}

export default function BookingForm({ providerSlug }: { providerSlug: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/providers/${providerSlug}/slots`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]));
  }, [providerSlug]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setStatus(null);
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerSlug,
        slotStart: selected.start,
        slotEnd: selected.end,
        requesterName: name,
        requesterEmail: email,
        requesterPhone: phone,
        note: note || undefined,
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(typeof data.error === "string" ? data.error : "Could not submit request");
      return;
    }
    setStatus("Request sent! You'll get an email once the provider responds.");
    setSelected(null);
  }

  if (slots === null) {
    return <p className="text-sm text-slate-500">Loading available times...</p>;
  }

  return (
    <div>
      <h2 className="font-medium">Pick an open time</h2>
      {slots.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No open slots in the next few weeks.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.start}
              onClick={() => setSelected(slot)}
              className={`rounded-md border px-3 py-2 text-xs ${
                selected?.start === slot.start
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300"
              }`}
            >
              {new Date(slot.start).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <h3 className="font-medium">Your details</h3>
          <input
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Request this slot"}
          </button>
        </form>
      ) : null}

      {status ? <p className="mt-4 text-sm">{status}</p> : null}
    </div>
  );
}
