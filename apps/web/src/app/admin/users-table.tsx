"use client";

import { useState } from "react";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  providerSlug: string | null;
};

/** Interactive users table for /admin: promote/demote role, delete account. Talks
 * directly to /api/admin/users/[id] and refreshes its own local state, so there's no
 * server-action Router Cache staleness to worry about (see dashboard's revalidatePath
 * pattern — same class of bug, avoided here by just re-fetching after each mutation). */
export default function UsersTable({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(id: string, role: "USER" | "ADMIN") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(id: string, label: string) {
    if (!confirm(`Delete ${label}? This can't be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Role</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Provider?</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Joined</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name ?? "—"}</td>
                  <td className="px-4 py-2">{u.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        u.role === "ADMIN"
                          ? "rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {u.role}
                    </span>
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2">{u.providerSlug ?? "—"}</td>
                  <td className="px-4 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {u.role === "ADMIN" ? (
                        <button
                          type="button"
                          disabled={isSelf || busyId === u.id}
                          onClick={() => setRole(u.id, "USER")}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => setRole(u.id, "ADMIN")}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                        >
                          Make admin
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isSelf || busyId === u.id}
                        onClick={() => deleteUser(u.id, u.email ?? u.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
