"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DIRECTIONS = [
  { value: ">=", label: ">= (higher is better)" },
  { value: ">", label: "> (strictly higher)" },
  { value: "<=", label: "<= (lower is better)" },
  { value: "<", label: "< (strictly lower)" },
  { value: "=", label: "= (exact match)" },
];

const UNIT_TYPES = [
  { value: "%", label: "Percentage (%)", prefix: "", suffix: "%", decimals: 1 },
  { value: "SAR", label: "Currency (SAR)", prefix: "SAR ", suffix: "", decimals: 0 },
  { value: "USD", label: "Currency (USD)", prefix: "$", suffix: "", decimals: 0 },
  { value: "count", label: "Count (#)", prefix: "", suffix: "", decimals: 0 },
  { value: "days", label: "Days", prefix: "", suffix: " days", decimals: 1 },
  { value: "score", label: "Score", prefix: "", suffix: " pts", decimals: 0 },
  { value: "ratio", label: "Ratio", prefix: "", suffix: "x", decimals: 2 },
  { value: "hours", label: "Hours", prefix: "", suffix: " hrs", decimals: 1 },
  { value: "incidents", label: "Incidents", prefix: "", suffix: "", decimals: 0 },
  { value: "leads", label: "Leads", prefix: "", suffix: "", decimals: 0 },
  { value: "clients", label: "Clients", prefix: "", suffix: "", decimals: 0 },
  { value: "custom", label: "Custom", prefix: "", suffix: "", decimals: 2 },
];

function formatValue(val: number, unit: string): string {
  const ut = UNIT_TYPES.find((u) => u.value === unit) || UNIT_TYPES[UNIT_TYPES.length - 1];
  const formatted = ut.decimals === 0 ? Math.round(val).toString() : val.toFixed(ut.decimals);
  return `${ut.prefix}${formatted}${ut.suffix}`;
}

const PERIODS = [
  { value: "MONTHLY", label: "Monthly", count: 12 },
  { value: "QUARTERLY", label: "Quarterly", count: 4 },
  { value: "HALF_ANNUAL", label: "Half-Annual", count: 2 },
  { value: "ANNUAL", label: "Annual", count: 1 },
];

const PERIOD_ORDER: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 2,
  HALF_ANNUAL: 3,
  ANNUAL: 4,
};

function getPeriodLabels(period: string): string[] {
  switch (period) {
    case "QUARTERLY": return ["Q1", "Q2", "Q3", "Q4"];
    case "HALF_ANNUAL": return ["H1", "H2"];
    case "ANNUAL": return ["Year"];
    default: return MONTHS;
  }
}

function getPeriodCount(period: string): number {
  return PERIODS.find((p) => p.value === period)?.count ?? 12;
}

/** Get valid tracking periods for a given target period (must be same or more frequent) */
function getValidTrackingPeriods(targetPeriod: string) {
  const targetOrder = PERIOD_ORDER[targetPeriod] ?? 1;
  return PERIODS.filter((p) => PERIOD_ORDER[p.value] <= targetOrder);
}

type Objective = {
  id: string;
  code: string;
  statement: string;
  unit: string;
  targetDirection: string;
  targetPeriod: string;
  trackingPeriod: string;
  monthlyBaseline: number[];
  monthlyTarget: number[];
};

type KeyAction = {
  id: string;
  code: string;
  description: string;
  dueDate: string;
  owner: string;
  frequency: string;
};

type Division = { id: string; name: string; headName: string; initials: string };

export default function DivisionPlanPage() {
  const { divisionId } = useParams<{ divisionId: string }>();
  const router = useRouter();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [actions, setActions] = useState<KeyAction[]>([]);
  const [division, setDivision] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);

  // Objective form
  const [showObjForm, setShowObjForm] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [objForm, setObjForm] = useState({
    statement: "",
    unit: "",
    targetDirection: ">=",
    targetPeriod: "MONTHLY",
    trackingPeriod: "MONTHLY",
    monthlyBaseline: Array(12).fill(0) as number[],
    monthlyTarget: Array(12).fill(0) as number[],
  });

  // Action form
  const [showActForm, setShowActForm] = useState(false);
  const [editingAct, setEditingAct] = useState<KeyAction | null>(null);
  const [actForm, setActForm] = useState({ description: "", dueDate: "", owner: "", frequency: "MONTHLY" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    type: "objective" | "action";
    id: string;
    label: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    const [objRes, actRes, divRes] = await Promise.all([
      fetch(`/api/objectives?divisionId=${divisionId}`),
      fetch(`/api/actions?divisionId=${divisionId}`),
      fetch(`/api/functional-plans`),
    ]);
    setObjectives(await objRes.json());
    setActions(await actRes.json());
    const divData = await divRes.json();
    const div = divData.divisions?.find((d: { id: string }) => d.id === divisionId);
    if (div) setDivision(div);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [divisionId]);

  // ─── Target Period change handler ─────────────────────
  function handleTargetPeriodChange(newTargetPeriod: string) {
    const count = getPeriodCount(newTargetPeriod);
    // If current tracking period is less frequent than new target period, reset it
    const newTrackingPeriod =
      PERIOD_ORDER[objForm.trackingPeriod] > PERIOD_ORDER[newTargetPeriod]
        ? newTargetPeriod
        : objForm.trackingPeriod;
    setObjForm({
      ...objForm,
      targetPeriod: newTargetPeriod,
      trackingPeriod: newTrackingPeriod,
      monthlyBaseline: Array(count).fill(0),
      monthlyTarget: Array(count).fill(0),
    });
  }

  // ─── Objective CRUD ────────────────────────────────────

  function openCreateObj() {
    setEditingObj(null);
    setObjForm({
      statement: "", unit: "", targetDirection: ">=",
      targetPeriod: "MONTHLY", trackingPeriod: "MONTHLY",
      monthlyBaseline: Array(12).fill(0), monthlyTarget: Array(12).fill(0),
    });
    setError("");
    setShowObjForm(true);
  }

  function openEditObj(obj: Objective) {
    setEditingObj(obj);
    setObjForm({
      statement: obj.statement,
      unit: obj.unit,
      targetDirection: obj.targetDirection,
      targetPeriod: obj.targetPeriod || "MONTHLY",
      trackingPeriod: obj.trackingPeriod || "MONTHLY",
      monthlyBaseline: [...obj.monthlyBaseline],
      monthlyTarget: [...obj.monthlyTarget],
    });
    setError("");
    setShowObjForm(true);
  }

  function setArrayValue(field: "monthlyBaseline" | "monthlyTarget", idx: number, val: string) {
    const arr = [...objForm[field]];
    arr[idx] = parseFloat(val) || 0;
    setObjForm({ ...objForm, [field]: arr });
  }

  function fillAll(field: "monthlyBaseline" | "monthlyTarget", val: number) {
    const count = getPeriodCount(objForm.targetPeriod);
    setObjForm({ ...objForm, [field]: Array(count).fill(val) });
  }

  async function saveObjective() {
    setError("");
    setSaving(true);
    try {
      const payload = editingObj
        ? { id: editingObj.id, ...objForm }
        : { ...objForm, divisionId };
      const res = await fetch("/api/objectives", {
        method: editingObj ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setError(data.error || "Failed to save");
        } catch {
          setError(`Failed to save (${res.status})`);
        }
        setSaving(false);
        return;
      }
      setSaving(false);
      setShowObjForm(false);
      loadData();
    } catch (e) {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  function requestDeleteObjective(obj: Objective) {
    setDeleteModal({ type: "objective", id: obj.id, label: obj.statement });
    setDeleteError("");
  }

  // ─── Action CRUD ───────────────────────────────────────

  function openCreateAct() {
    setEditingAct(null);
    setActForm({ description: "", dueDate: "", owner: "", frequency: "MONTHLY" });
    setError("");
    setShowActForm(true);
  }

  function openEditAct(action: KeyAction) {
    setEditingAct(action);
    setActForm({
      description: action.description,
      dueDate: action.dueDate.split("T")[0],
      owner: action.owner,
      frequency: action.frequency,
    });
    setError("");
    setShowActForm(true);
  }

  async function saveAction() {
    setError("");
    setSaving(true);
    try {
      const payload = editingAct
        ? { id: editingAct.id, ...actForm }
        : { ...actForm, divisionId };
      const res = await fetch("/api/actions", {
        method: editingAct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setError(data.error || "Failed to save");
        } catch {
          setError(`Failed to save (${res.status})`);
        }
        setSaving(false);
        return;
      }
      setSaving(false);
      setShowActForm(false);
      loadData();
    } catch (e) {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  function requestDeleteAction(action: KeyAction) {
    setDeleteModal({ type: "action", id: action.id, label: action.description });
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    setDeleteError("");
    const endpoint = deleteModal.type === "objective" ? "objectives" : "actions";
    const res = await fetch(`/api/${endpoint}?id=${deleteModal.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setDeleteModal(null);
    loadData();
  }

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[1100px]">
          <div className="h-16 animate-pulse rounded-xl bg-bg-mid" />
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-bg-mid" />
        </div>
      </main>
    );
  }

  const targetLabels = getPeriodLabels(objForm.targetPeriod);
  const targetCount = getPeriodCount(objForm.targetPeriod);
  const validTrackingPeriods = getValidTrackingPeriods(objForm.targetPeriod);

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/plans")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-sub hover:bg-bg-mid"
          >
            &larr;
          </button>
          <div>
            <h1 className="animate-fade-in-up font-heading text-[26px] font-bold text-text-hd">
              {division?.name || "Division"} Plan
            </h1>
            <p className="mt-0.5 text-[13px] text-text-sub">
              {division?.headName} &middot; Objectives with targets & key actions
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: Strategic Objectives                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-[13px] font-bold text-teal">1</div>
            <h2 className="text-[16px] font-semibold text-text-hd">Strategic Objectives</h2>
          </div>
          <button onClick={openCreateObj} className="rounded-lg bg-brown px-4 py-2 text-[12px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]">
            + Add Objective
          </button>
        </div>

        {objectives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-md bg-bg-mid p-10 text-center">
            <p className="text-[14px] text-text-sub">No objectives yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {objectives.map((obj, idx) => {
              const objTargetLabels = getPeriodLabels(obj.targetPeriod || "MONTHLY");
              return (
                <div key={obj.id} className="rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                  <div className="border-b border-border p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-xs font-bold text-teal">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <div>
                          <div className="text-[14px] font-semibold text-text-hd">{obj.statement}</div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <span className="rounded-md bg-bg-mid px-2 py-0.5 text-[11px] font-medium text-text-sub">
                              Unit: <strong className="text-text-bd">{UNIT_TYPES.find((u) => u.value === obj.unit)?.label || obj.unit}</strong>
                            </span>
                            <span className="rounded-md bg-bg-mid px-2 py-0.5 text-[11px] font-medium text-text-sub">
                              Direction: <strong className="text-text-bd">{obj.targetDirection}</strong>
                            </span>
                            <span className="rounded-md bg-brown/15 px-2 py-0.5 text-[11px] font-medium text-brown">
                              Target: {PERIODS.find((p) => p.value === (obj.targetPeriod || "MONTHLY"))?.label}
                            </span>
                            <span className="rounded-md bg-teal/15 px-2 py-0.5 text-[11px] font-medium text-teal">
                              Tracking: {PERIODS.find((p) => p.value === obj.trackingPeriod)?.label || "Monthly"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditObj(obj)} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-info hover:bg-info-bg">Edit</button>
                        <button onClick={() => requestDeleteObjective(obj)} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-red hover:bg-red-bg">Delete</button>
                      </div>
                    </div>
                  </div>

                  {/* Target Grid */}
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-text-mut" />
                          {objTargetLabels.map((m) => (
                            <th key={m} className="px-2 py-1.5 text-center font-semibold uppercase tracking-wider text-text-mut">{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1.5 font-semibold text-text-sub">Baseline</td>
                          {obj.monthlyBaseline.map((v, i) => (
                            <td key={i} className="px-2 py-1.5 text-center text-text-sub">{formatValue(v, obj.unit)}</td>
                          ))}
                        </tr>
                        <tr className="bg-bg-mid/30">
                          <td className="px-2 py-1.5 font-semibold text-brown">Target</td>
                          {obj.monthlyTarget.map((v, i) => (
                            <td key={i} className="px-2 py-1.5 text-center font-medium text-brown">{formatValue(v, obj.unit)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: Key Actions                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blush/15 text-[13px] font-bold text-blush">2</div>
            <h2 className="text-[16px] font-semibold text-text-hd">Key Actions</h2>
          </div>
          <button onClick={openCreateAct} className="rounded-lg bg-brown px-4 py-2 text-[12px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]">
            + Add Action
          </button>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-md bg-bg-mid p-10 text-center">
            <p className="text-[14px] text-text-sub">No actions yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">#</th>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Action</th>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Frequency</th>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Due Date</th>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Owner</th>
                  <th className="border-b border-border bg-bg-mid/50 px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">Actions</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action, i) => (
                  <tr key={action.id} className="hover:bg-bg-mid/30">
                    <td className="border-b border-border/50 px-4 py-3 text-text-mut">{i + 1}</td>
                    <td className="border-b border-border/50 px-4 py-3 text-text-bd">{action.description}</td>
                    <td className="border-b border-border/50 px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${action.frequency === "QUARTERLY" ? "bg-sand/20 text-sand-dk" : "bg-teal/20 text-teal"}`}>
                        {action.frequency === "QUARTERLY" ? "Quarterly" : "Monthly"}
                      </span>
                    </td>
                    <td className="border-b border-border/50 px-4 py-3 text-text-sub">
                      {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="border-b border-border/50 px-4 py-3 text-text-sub">{action.owner}</td>
                    <td className="border-b border-border/50 px-4 py-3 text-right">
                      <button onClick={() => openEditAct(action)} className="mr-2 text-[12px] font-medium text-info hover:underline">Edit</button>
                      <button onClick={() => requestDeleteAction(action)} className="text-[12px] font-medium text-red hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Objective Form Modal                                */}
      {/* ═══════════════════════════════════════════════════ */}
      {showObjForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="animate-scale-in w-full max-w-3xl rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">
              {editingObj ? "Edit Objective" : "New Strategic Objective"}
            </h3>

            <div className="flex flex-col gap-5">
              {/* Statement */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Objective Statement</label>
                <textarea
                  value={objForm.statement}
                  onChange={(e) => setObjForm({ ...objForm, statement: e.target.value })}
                  placeholder="e.g. Reduce operational cost by 12%"
                  rows={2}
                  className="resize-y rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] leading-relaxed text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>

              {/* Unit + Direction */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Unit of Measure</label>
                  <select
                    value={objForm.unit}
                    onChange={(e) => setObjForm({ ...objForm, unit: e.target.value })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    <option value="">Select unit...</option>
                    {UNIT_TYPES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Target Direction</label>
                  <select
                    value={objForm.targetDirection}
                    onChange={(e) => setObjForm({ ...objForm, targetDirection: e.target.value })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    {DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Period + Tracking Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Target Period</label>
                  <select
                    value={objForm.targetPeriod}
                    onChange={(e) => handleTargetPeriodChange(e.target.value)}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    {PERIODS.map((tp) => (
                      <option key={tp.value} value={tp.value}>{tp.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-text-mut">How often targets are set</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Tracking Period</label>
                  <select
                    value={objForm.trackingPeriod}
                    onChange={(e) => setObjForm({ ...objForm, trackingPeriod: e.target.value })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  >
                    {validTrackingPeriods.map((tp) => (
                      <option key={tp.value} value={tp.value}>{tp.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-text-mut">How often actuals are reported</span>
                </div>
              </div>

              {/* Period explanation */}
              {objForm.targetPeriod !== objForm.trackingPeriod && (
                <div className="rounded-lg border border-brown/20 bg-brown/5 px-4 py-2.5 text-[12px] text-brown">
                  {PERIODS.find((p) => p.value === objForm.targetPeriod)?.label} targets, updated{" "}
                  {PERIODS.find((p) => p.value === objForm.trackingPeriod)?.label?.toLowerCase()} &mdash;{" "}
                  you&apos;ll set {targetCount} target{targetCount > 1 ? "s" : ""} and report actuals{" "}
                  {PERIODS.find((p) => p.value === objForm.trackingPeriod)?.label?.toLowerCase()}
                </div>
              )}

              {/* Unit Preview */}
              {objForm.unit && (
                <div className="rounded-lg bg-bg-mid px-4 py-2.5 text-[12px] text-text-sub">
                  Format preview: <strong className="text-text-bd">{formatValue(123.45, objForm.unit)}</strong>
                </div>
              )}

              {/* Baseline */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                    {PERIODS.find((p) => p.value === objForm.targetPeriod)?.label} Baseline
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-mut">Fill all:</span>
                    <input
                      type="number"
                      className="w-20 rounded border border-border bg-bg-page px-2 py-1 text-[11px] text-text-hd focus:border-brown/40 focus:outline-none"
                      placeholder="value"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fillAll("monthlyBaseline", parseFloat((e.target as HTMLInputElement).value) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value) fillAll("monthlyBaseline", parseFloat(e.target.value) || 0);
                      }}
                    />
                  </div>
                </div>
                <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${targetCount}, minmax(0, 1fr))` }}>
                  {targetLabels.map((m, i) => (
                    <div key={m} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold uppercase text-text-mut">{m}</span>
                      <input
                        type="number"
                        step="any"
                        value={objForm.monthlyBaseline[i] ?? 0}
                        onChange={(e) => setArrayValue("monthlyBaseline", i, e.target.value)}
                        className="w-full rounded border border-border bg-bg-page px-1 py-1.5 text-center text-[12px] text-text-hd focus:border-brown/40 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Target */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                    {PERIODS.find((p) => p.value === objForm.targetPeriod)?.label} Target
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-mut">Fill all:</span>
                    <input
                      type="number"
                      className="w-20 rounded border border-border bg-bg-page px-2 py-1 text-[11px] text-text-hd focus:border-brown/40 focus:outline-none"
                      placeholder="value"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fillAll("monthlyTarget", parseFloat((e.target as HTMLInputElement).value) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value) fillAll("monthlyTarget", parseFloat(e.target.value) || 0);
                      }}
                    />
                  </div>
                </div>
                <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${targetCount}, minmax(0, 1fr))` }}>
                  {targetLabels.map((m, i) => (
                    <div key={m} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold uppercase text-text-mut">{m}</span>
                      <input
                        type="number"
                        step="any"
                        value={objForm.monthlyTarget[i] ?? 0}
                        onChange={(e) => setArrayValue("monthlyTarget", i, e.target.value)}
                        className="w-full rounded border border-border bg-bg-page px-1 py-1.5 text-center text-[12px] font-medium text-brown focus:border-brown/40 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">{error}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowObjForm(false)} className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">Cancel</button>
              <button onClick={saveObjective} disabled={saving} className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50">
                {saving ? "Saving..." : editingObj ? "Update Objective" : "Create Objective"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* Action Form Modal                                   */}
      {/* ═══════════════════════════════════════════════════ */}
      {showActForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="animate-scale-in w-full max-w-lg rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="mb-6 font-heading text-xl font-bold text-text-hd">
              {editingAct ? "Edit Key Action" : "New Key Action"}
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Action Description</label>
                <textarea
                  value={actForm.description}
                  onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
                  placeholder="e.g. Renegotiate top-10 vendor contracts"
                  rows={2}
                  className="resize-y rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] leading-relaxed text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Due Date</label>
                  <input type="date" value={actForm.dueDate} onChange={(e) => setActForm({ ...actForm, dueDate: e.target.value })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Owner</label>
                  <input type="text" value={actForm.owner} onChange={(e) => setActForm({ ...actForm, owner: e.target.value })}
                    placeholder="e.g. Sarah K."
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Update Frequency</label>
                  <select value={actForm.frequency} onChange={(e) => setActForm({ ...actForm, frequency: e.target.value })}
                    className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10">
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">{error}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowActForm(false)} className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40">Cancel</button>
              <button onClick={saveAction} disabled={saving} className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50">
                {saving ? "Saving..." : editingAct ? "Update Action" : "Create Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-sm rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-bg">
              <svg className="h-6 w-6 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="mt-4 font-heading text-lg font-bold text-text-hd">
              Delete {deleteModal.type === "objective" ? "Objective" : "Action"}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-sub">
              Are you sure you want to delete <strong className="text-text-bd">{deleteModal.label}</strong>?
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd hover:border-brown/40"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-red/90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
