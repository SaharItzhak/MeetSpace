"use client";

import { useState } from "react";

type Contact = {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "APPROVED" | "BLOCKED";
  requestedAt: string;
};

/** Client-side contacts list for a provider: add/approve/block/remove. Fetches directly
 * from /api/providers/me/contacts* and keeps local state, same pattern as admin/users-table. */
export default function ContactsTable({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/providers/me/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to add contact");
      setContacts((prev) => [
        body.contact,
        ...prev.filter((c) => c.id !== body.contact.id),
      ]);
      setEmail("");
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setAdding(false);
    }
  }

  async function setStatus(id: string, status: Contact["status"]) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/providers/me/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update status");
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function removeContact(id: string, label: string) {
    if (!confirm(`Remove ${label}? They'll need to request access again.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/providers/me/contacts/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to remove contact");
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove contact");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <form onSubmit={addContact} className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-4">
        <label className="text-sm">
          <span className="label">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
            className="input mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="label">Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>
        <button type="submit" disabled={adding} className="btn-primary px-3.5 py-2 text-xs">
          {adding ? "Adding..." : "+ Add & approve"}
        </button>
      </form>

      {error && <p className="m-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Requested</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5">{c.name ?? "—"}</td>
                <td className="px-4 py-2.5">{c.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                </td>
                <td className="px-4 py-2.5">{new Date(c.requestedAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-2">
                    {c.status !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => setStatus(c.id, "APPROVED")}
                        className="btn-xs"
                      >
                        Approve
                      </button>
                    )}
                    {c.status !== "BLOCKED" && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => setStatus(c.id, "BLOCKED")}
                        className="btn-xs"
                      >
                        Block
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => removeContact(c.id, c.name ?? c.email)}
                      className="btn-danger px-2.5 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No one has requested access yet. Add someone above to pre-approve them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
