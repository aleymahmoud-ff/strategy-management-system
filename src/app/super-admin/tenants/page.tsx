"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";

type Org = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; departments: number; periods: number };
  users: { id: string; name: string; email: string }[];
};

export default function TenantsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function loadOrgs() {
    const res = await apiFetch("/api/tenants");
    if (res.ok) setOrgs(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadOrgs(); }, []);

  function openCreate() {
    setForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "" });
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(org: Org) {
    setForm({ name: org.name, slug: org.slug, adminName: "", adminEmail: "", adminPassword: "" });
    setEditingId(org.id);
    setError("");
    setShowForm(true);
  }

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm((prev) => ({ ...prev, name, slug: prev.slug || slug }));
  }

  async function handleSave() {
    setError("");
    if (!form.name || !form.slug) {
      setError("Name and slug are required");
      return;
    }
    if (!editingId && (!form.adminName || !form.adminEmail || !form.adminPassword)) {
      setError("Admin name, email, and password are required for new organizations");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/tenants", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, name: form.name, slug: form.slug } : form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed (${res.status})`);
        setSaving(false);
        return;
      }
      setSaving(false);
      setShowForm(false);
      loadOrgs();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setDeleteError("");
    const res = await apiFetch(`/api/tenants?id=${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error || "Cannot delete");
      setSaving(false);
      return;
    }
    setSaving(false);
    setDeleteTarget(null);
    loadOrgs();
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="animate-fade-in-up font-heading text-[30px] font-bold text-text-hd">
            Tenant Management
          </h1>
          <p className="mt-1 text-[13px] text-text-sub">
            Manage organizations, create new tenants, and assign strategy managers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
        >
          + New Organization
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-text-sub">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
          <p className="text-[15px] font-medium text-text-bd">No organizations yet</p>
          <p className="mt-1 text-[13px] text-text-sub">Create your first organization to get started</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk"
          >
            + New Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="card-glow group relative rounded-xl border border-border bg-bg-card p-6 shadow-[0_1px_6px_rgba(0,0,0,0.25)] transition-all"
            >
              {/* Actions */}
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(org)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-info hover:bg-bg-mid"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setDeleteTarget(org); setDeleteError(""); }}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-red hover:bg-red-bg"
                >
                  Delete
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brown/10 text-sm font-bold text-brown">
                  {org.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-text-hd">{org.name}</div>
                  <div className="text-[12px] font-mono text-text-sub">/{org.slug}</div>
                </div>
              </div>

              <div className="mb-4 flex gap-4 text-[12px] text-text-sub">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-teal" />
                  {org._count.users} user{org._count.users !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blush" />
                  {org._count.departments} dept{org._count.departments !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-sand-dk" />
                  {org._count.periods} period{org._count.periods !== 1 ? "s" : ""}
                </span>
              </div>

              {org.users.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                    Strategy Managers
                  </p>
                  {org.users.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 py-0.5 text-[12px] text-text-sub">
                      <span className="text-text-bd">{u.name}</span>
                      <span className="text-text-mut">{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-md rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">
              {editingId ? "Edit Organization" : "New Organization"}
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Organization Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-mut">/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="acme-corp"
                    className="flex-1 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 font-mono text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  />
                </div>
              </div>

              {!editingId && (
                <>
                  <div className="mt-2 border-t border-border pt-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">
                      Initial Strategy Manager
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Full Name</label>
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="e.g. John Smith"
                      className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Email</label>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="admin@company.com"
                      className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Password</label>
                    <input
                      type="password"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Organization"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-sm rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-bg">
              <svg className="h-6 w-6 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="mt-4 font-heading text-lg font-bold text-text-hd">Delete Organization</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-sub">
              Are you sure you want to delete <strong className="text-text-bd">{deleteTarget.name}</strong>?
              The organization must have no users or departments to be deleted.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={saving} className="rounded-lg bg-red px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-red/90 disabled:opacity-50">
                {saving ? "Deleting..." : "Delete Organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
