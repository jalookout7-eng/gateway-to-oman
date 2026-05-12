"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Eye, EyeOff, Trash2, Shield } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "viewer";
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

const ROLE_BADGE: Record<AdminUser["role"], string> = {
  owner: "bg-gold/15 text-gold-dark ring-gold/30",
  admin: "bg-blue-50 text-blue-700 ring-blue-200",
  viewer: "bg-gray-100 text-gray-600 ring-gray-200",
};

function authHeaders() {
  return {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`,
    "Content-Type": "application/json",
  };
}

export function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch admin users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(user: AdminUser) {
    await fetch(`/api/admin/admin-users/${user.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ active: !user.active }),
    });
    fetchUsers();
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`Delete admin user ${user.email}? This can&apos;t be undone.`)) return;
    const res = await fetch(`/api/admin/admin-users/${user.id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    fetchUsers();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <p className="text-sm text-gray-600">
          People who can sign into the admin dashboard. Owners can manage other admins.
        </p>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg gold-gradient text-white px-3 py-1.5 text-sm font-semibold hover:shadow-md transition-shadow"
        >
          <UserPlus className="h-4 w-4" />
          {showAddForm ? "Close" : "Add admin"}
        </button>
      </div>

      {showAddForm && (
        <AddAdminUserForm
          onCreated={() => {
            setShowAddForm(false);
            fetchUsers();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading admin users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No admin users yet — seed one with the migration script.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg ring-1 ring-gray-100 overflow-hidden">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="font-semibold text-navy text-sm">{u.full_name ?? u.email}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${ROLE_BADGE[u.role]}`}
                  >
                    {u.role}
                  </span>
                  {!u.active && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-500 ring-1 ring-gray-200">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {u.last_login_at
                    ? `Last login ${new Date(u.last_login_at).toLocaleDateString()}`
                    : "Never signed in"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(u)}
                  title={u.active ? "Disable" : "Enable"}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
                >
                  {u.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {u.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => deleteUser(u)}
                    title="Delete"
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddAdminUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ email, full_name: fullName, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to add admin user");
        return;
      }
      onCreated();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-gray-50 ring-1 ring-gray-200 p-4 space-y-3"
    >
      <h3 className="font-heading text-sm font-semibold text-navy inline-flex items-center gap-2">
        <Shield className="h-4 w-4 text-gold" />
        New admin user
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Password * (min 8)</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-navy"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          >
            <option value="admin">Admin (full access)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-navy text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {submitting ? "Adding…" : "Add admin user"}
      </button>
    </form>
  );
}
