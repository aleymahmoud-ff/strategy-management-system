"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";

type Assignment = {
  departmentId: string;
  permission: string;
  department: { name: string };
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId: string | null;
  department: { name: string } | null;
  assignments: Assignment[];
};

type Department = { id: string; name: string };

const ROLES = [
  { value: "FUNCTION_HEAD", label: "Function Head" },
  { value: "STRATEGY_MANAGER", label: "Strategy Manager" },
  { value: "EXECUTIVE", label: "Executive" },
];

const PERMISSION_LABELS: Record<string, string> = {
  EDIT: "Edit",
  VIEW_ONLY: "View Only",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FUNCTION_HEAD",
    departmentId: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Assignment editor
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [tempAssignments, setTempAssignments] = useState<{ departmentId: string; permission: string }[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadUsers() {
    const res = await apiFetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function loadDepartments() {
    const res = await apiFetch("/api/functional-plans");
    const data = await res.json();
    if (data.departments) {
      setDepartments(data.departments.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
    }
  }

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "FUNCTION_HEAD", departmentId: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      departmentId: user.departmentId || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    if (editingUser) {
      const body: Record<string, string> = { id: editingUser.id };
      if (form.name !== editingUser.name) body.name = form.name;
      if (form.email !== editingUser.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (form.role !== editingUser.role) body.role = form.role;
      if (form.departmentId !== (editingUser.departmentId || ""))
        body.departmentId = form.departmentId || "";

      const res = await apiFetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
        setSaving(false);
        return;
      }
    } else {
      if (!form.password) {
        setError("Password is required for new users");
        setSaving(false);
        return;
      }
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.role === "FUNCTION_HEAD" ? form.departmentId || null : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    loadUsers();
  }

  // --- Assignments ---

  function openAssignments(user: User) {
    setAssignUser(user);
    setTempAssignments(
      user.assignments.map((a) => ({ departmentId: a.departmentId, permission: a.permission }))
    );
    setShowAssignments(true);
  }

  function addAssignment() {
    const unassigned = departments.filter(
      (d) => !tempAssignments.some((a) => a.departmentId === d.id)
    );
    if (unassigned.length === 0) return;
    setTempAssignments([...tempAssignments, { departmentId: unassigned[0].id, permission: "EDIT" }]);
  }

  function removeAssignment(idx: number) {
    setTempAssignments(tempAssignments.filter((_, i) => i !== idx));
  }

  function updateAssignment(idx: number, field: "departmentId" | "permission", value: string) {
    const updated = [...tempAssignments];
    updated[idx] = { ...updated[idx], [field]: value };
    setTempAssignments(updated);
  }

  async function saveAssignments() {
    if (!assignUser) return;
    setSavingAssign(true);
    await apiFetch("/api/users/assignments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: assignUser.id, assignments: tempAssignments }),
    });
    setSavingAssign(false);
    setShowAssignments(false);
    loadUsers();
  }

  // --- Delete ---

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await apiFetch(`/api/users?id=${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error || "Cannot delete");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setDeleteTarget(null);
    loadUsers();
  }

  const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label || role;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="animate-fade-in-up font-heading text-[32px] font-bold text-text-hd">User Management</h1>
          <p className="mt-1 text-[13px] text-text-sub">
            Manage user accounts, roles, and department assignments
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page transition-colors hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
        >
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
        {loading ? (
          <div className="p-8 text-center text-text-sub">Loading...</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Name</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Email</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Role</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Assigned Departments</th>
                <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-bg-mid/30">
                  <td className="border-b border-border/50 px-4 py-3 font-medium text-text-bd">{user.name}</td>
                  <td className="border-b border-border/50 px-4 py-3 text-text-sub">{user.email}</td>
                  <td className="border-b border-border/50 px-4 py-3">
                    <span className="inline-flex rounded-md bg-bg-mid px-2.5 py-0.5 text-[11px] font-semibold text-text-sub">
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="border-b border-border/50 px-4 py-3">
                    {user.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {user.assignments.map((a) => (
                          <span
                            key={a.departmentId}
                            className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
                              a.permission === "EDIT"
                                ? "bg-green-bg text-green"
                                : "bg-bg-deep text-text-mut"
                            }`}
                          >
                            {a.department.name} ({PERMISSION_LABELS[a.permission]})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-mut">—</span>
                    )}
                  </td>
                  <td className="border-b border-border/50 px-4 py-3 text-right">
                    <button
                      onClick={() => openAssignments(user)}
                      className="mr-2 text-[12px] font-medium text-brown hover:underline"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => openEdit(user)}
                      className="mr-2 text-[12px] font-medium text-info hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(user); setDeleteError(""); }}
                      className="text-[12px] font-medium text-red hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-md rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">
              {editingUser ? "Edit User" : "Add User"}
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                  Password {editingUser && "(leave blank to keep current)"}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">{error}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd transition-colors hover:border-brown/40">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page transition-colors hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50">
                {saving ? "Saving..." : editingUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Assignments Modal */}
      {showAssignments && assignUser && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-lg rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-1 font-heading text-xl font-bold text-text-hd">Department Assignments</h3>
            <p className="mb-6 text-[13px] text-text-sub">
              Assign <strong>{assignUser.name}</strong> to departments with Edit or View Only access
            </p>

            <div className="flex flex-col gap-3">
              {tempAssignments.length === 0 && (
                <p className="py-4 text-center text-[13px] text-text-mut">No departments assigned</p>
              )}
              {tempAssignments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <select
                    value={a.departmentId}
                    onChange={(e) => updateAssignment(idx, "departmentId", e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} disabled={tempAssignments.some((ta, i) => i !== idx && ta.departmentId === d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={a.permission}
                    onChange={(e) => updateAssignment(idx, "permission", e.target.value)}
                    className="w-36 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    <option value="EDIT">Edit</option>
                    <option value="VIEW_ONLY">View Only</option>
                  </select>
                  <button
                    onClick={() => removeAssignment(idx)}
                    className="rounded-md p-1.5 text-red hover:bg-red-bg"
                    title="Remove"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {tempAssignments.length < departments.length && (
              <button
                onClick={addAssignment}
                className="mt-3 text-[12px] font-semibold text-brown hover:underline"
              >
                + Add Department
              </button>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAssignments(false)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">Cancel</button>
              <button onClick={saveAssignments} disabled={savingAssign}
                className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50">
                {savingAssign ? "Saving..." : "Save Assignments"}
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
            <h3 className="mt-4 font-heading text-lg font-bold text-text-hd">Delete User</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-sub">
              Are you sure you want to delete <strong className="text-text-bd">{deleteTarget.name}</strong> ({deleteTarget.email})?
              This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">{deleteError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="rounded-lg bg-red px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-red/90 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
