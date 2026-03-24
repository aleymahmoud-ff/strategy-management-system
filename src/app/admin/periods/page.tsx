"use client";

import { useEffect, useState } from "react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

type Period = {
  id: string;
  label: string;
  year: number;
  month: number;
  deadline: string;
  isActive: boolean;
  totalSubmissions: number;
  submittedCount: number;
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ year: 2026, month: 1, deadline: "", isActive: false });
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Period | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function loadPeriods() {
    const res = await fetch("/api/periods");
    const data = await res.json();
    setPeriods(data);
    setLoading(false);
  }

  useEffect(() => { loadPeriods(); }, []);

  function openCreate() {
    setForm({ year: 2026, month: new Date().getMonth() + 1, deadline: "", isActive: false });
    setError("");
    setShowForm(true);
  }

  async function handleCreate() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        try { setError(JSON.parse(text).error); } catch { setError(`Failed (${res.status})`); }
        setSaving(false);
        return;
      }
      setSaving(false);
      setShowForm(false);
      loadPeriods();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  async function setActive(id: string) {
    await fetch("/api/periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: true }),
    });
    loadPeriods();
  }

  function startEditDeadline(p: Period) {
    setEditingId(p.id);
    setEditDeadline(p.deadline.split("T")[0]);
  }

  async function saveDeadline(id: string) {
    await fetch("/api/periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, deadline: editDeadline }),
    });
    setEditingId(null);
    loadPeriods();
  }

  async function confirmDeletePeriod() {
    if (!deleteTarget) return;
    setSaving(true);
    setDeleteError("");
    const res = await fetch(`/api/periods?id=${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error || "Cannot delete");
      setSaving(false);
      return;
    }
    setSaving(false);
    setDeleteTarget(null);
    loadPeriods();
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="animate-fade-in-up font-heading text-[32px] font-bold text-text-hd">Period Management</h1>
          <p className="mt-1 text-[13px] text-text-sub">Create monthly periods and set submission deadlines</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]">
          + New Period
        </button>
      </div>

      <div className="rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
        {loading ? (
          <div className="p-8 text-center text-text-sub">Loading...</div>
        ) : periods.length === 0 ? (
          <div className="p-8 text-center text-text-sub">No periods created yet</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Period</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Deadline</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Status</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Submissions</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const pastDeadline = new Date() > new Date(p.deadline);
                return (
                  <tr key={p.id} className="hover:bg-bg-mid/30">
                    <td className="border-b border-border/50 px-4 py-3">
                      <div className="font-medium text-text-bd">{p.label}</div>
                    </td>
                    <td className="border-b border-border/50 px-4 py-3">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="rounded border border-border bg-bg-page px-2 py-1 text-[12px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                          />
                          <button onClick={() => saveDeadline(p.id)} className="text-[11px] font-semibold text-green hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-[11px] text-text-mut hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-text-sub ${pastDeadline ? "line-through" : ""}`}>
                            {new Date(p.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button onClick={() => startEditDeadline(p)} className="text-[11px] text-info hover:underline">Edit</button>
                        </div>
                      )}
                    </td>
                    <td className="border-b border-border/50 px-4 py-3">
                      {p.isActive ? (
                        <span className="inline-flex rounded-md bg-green-bg px-2.5 py-0.5 text-[11px] font-semibold text-green">Active</span>
                      ) : pastDeadline ? (
                        <span className="inline-flex rounded-md bg-bg-mid px-2.5 py-0.5 text-[11px] font-semibold text-text-mut">Closed</span>
                      ) : (
                        <button onClick={() => setActive(p.id)} className="inline-flex rounded-md bg-amber-bg px-2.5 py-0.5 text-[11px] font-semibold text-amber hover:bg-amber/20">
                          Set Active
                        </button>
                      )}
                    </td>
                    <td className="border-b border-border/50 px-4 py-3 text-text-sub">
                      {p.submittedCount} / {p.totalSubmissions > 0 ? p.totalSubmissions : "6"} submitted
                    </td>
                    <td className="border-b border-border/50 px-4 py-3 text-right">
                      {p.totalSubmissions === 0 && (
                        <button onClick={() => { setDeleteTarget(p); setDeleteError(""); }} className="text-[12px] font-medium text-red hover:underline">Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Period Modal */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-md rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">New Period</h3>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Month</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 2026 })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Submission Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-brown"
                />
                <span className="text-[13px] text-text-bd">Set as active period</span>
              </label>

              {error && (
                <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">{error}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50">
                {saving ? "Creating..." : "Create Period"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Period Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-sm rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-bg">
              <svg className="h-6 w-6 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="mt-4 font-heading text-lg font-bold text-text-hd">Delete Period</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-sub">
              Are you sure you want to delete <strong className="text-text-bd">{deleteTarget.label}</strong>?
              This action cannot be undone.
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
                onClick={confirmDeletePeriod}
                disabled={saving}
                className="rounded-lg bg-red px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-red/90 disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Delete Period"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
