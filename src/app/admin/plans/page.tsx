"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch";

type Department = {
  id: string;
  slug: string;
  name: string;
  headName: string;
  initials: string;
  _count: { objectives: number; keyActions: number; users: number; submissions: number };
};

export default function PlansOverviewPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", headName: "", initials: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function loadDepartments() {
    const res = await apiFetch("/api/departments");
    if (res.ok) {
      setDepartments(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { loadDepartments(); }, []);

  function openCreate() {
    setForm({ name: "", headName: "", initials: "" });
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(div: Department) {
    setForm({ name: div.name, headName: div.headName, initials: div.initials });
    setEditingId(div.id);
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    setError("");
    if (!form.name || !form.headName || !form.initials) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/departments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed (${res.status})`);
        setSaving(false);
        return;
      }
      setSaving(false);
      setShowForm(false);
      loadDepartments();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setDeleteError("");
    const res = await apiFetch(`/api/departments?id=${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error || "Cannot delete");
      setSaving(false);
      return;
    }
    setSaving(false);
    setDeleteTarget(null);
    loadDepartments();
  }

  // Auto-generate initials from name
  function handleNameChange(name: string) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
    setForm((prev) => ({ ...prev, name, initials: prev.initials || initials }));
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="animate-fade-in-up font-heading text-[30px] font-bold text-text-hd">Plan Builder</h1>
          <p className="mt-1 text-[13px] text-text-sub">
            Manage departments, define strategic objectives, targets, and key actions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
        >
          + Add Department
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-text-sub">Loading...</div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
          <p className="text-[15px] font-medium text-text-bd">No departments yet</p>
          <p className="mt-1 text-[13px] text-text-sub">
            Create your first department to start building functional plans
          </p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
          >
            + Add Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {departments.map((div) => (
            <div
              key={div.id}
              className="card-glow group relative rounded-xl border border-border bg-bg-card p-6 shadow-[0_1px_6px_rgba(0,0,0,0.25)] transition-all"
            >
              {/* Actions dropdown */}
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(div)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-info hover:bg-bg-mid"
                  title="Edit department"
                >
                  Edit
                </button>
                {div._count.submissions === 0 && (
                  <button
                    onClick={() => { setDeleteTarget(div); setDeleteError(""); }}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-red hover:bg-red-bg"
                    title="Delete department"
                  >
                    Delete
                  </button>
                )}
              </div>

              <Link href={`/admin/plans/${div.id}`} className="block">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-deep text-sm font-bold text-brown">
                    {div.initials}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-text-hd group-hover:text-brown">
                      {div.name}
                    </div>
                    <div className="text-[12px] text-text-sub">{div.headName}</div>
                  </div>
                </div>

                <div className="flex gap-4 text-[12px] text-text-sub">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-teal" />
                    {div._count.objectives} objective{div._count.objectives !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-blush" />
                    {div._count.keyActions} action{div._count.keyActions !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-sand-dk" />
                    {div._count.users} user{div._count.users !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-md rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">
              {editingId ? "Edit Department" : "New Department"}
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Department Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Human Resources"
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Department Head</label>
                <input
                  type="text"
                  value={form.headName}
                  onChange={(e) => setForm({ ...form, headName: e.target.value })}
                  placeholder="e.g. Ahmed Al-Rashid"
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Initials (1-4 chars)</label>
                <input
                  type="text"
                  value={form.initials}
                  maxLength={4}
                  onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
                  placeholder="e.g. HR"
                  className="w-24 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] font-bold text-text-hd placeholder:text-text-mut placeholder:font-normal focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

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
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Department"}
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

            <h3 className="mt-4 font-heading text-lg font-bold text-text-hd">Delete Department</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-sub">
              Are you sure you want to delete <strong className="text-text-bd">{deleteTarget.name}</strong>?
              This will permanently remove all its objectives and key actions from this department.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-lg bg-red px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-red/90 disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Delete Department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
