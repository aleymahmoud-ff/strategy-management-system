"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { SubmissionBanner } from "@/components/functional-plans/submission-banner";
import { ObjectivesSection } from "@/components/functional-plans/objectives-section";
import { ActionsSection } from "@/components/functional-plans/actions-section";
import { ConfirmationView } from "@/components/functional-plans/confirmation-view";

type ObjectiveData = {
  id: string;
  code: string;
  statement: string;
  target: string;
  unit: string;
  baseline: string;
  targetDirection: string;
  trackingPeriod: string;
  achievedValue: string;
  note: string;
};

type ActionData = {
  id: string;
  code: string;
  description: string;
  dueDate: string;
  owner: string;
  frequency: string;
  status: string;
  progress: string;
  nextPriority: string;
  blockers: string;
};

type FormData = {
  period: { id: string; label: string; deadline: string };
  department: { id: string; name: string; headName: string; initials: string };
  submission: { id: string; status: string; submittedAt: string | null };
  isLocked: boolean;
  isAdmin: boolean;
  permission: string;
  objectives: ObjectiveData[];
  actions: ActionData[];
};

type PeriodOption = { id: string; label: string };

export default function SubmissionFormPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const router = useRouter();
  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin period selector
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Load periods list for admin
  useEffect(() => {
    fetch("/api/periods")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          setPeriods(data.map((p: { id: string; label: string }) => ({ id: p.id, label: p.label })));
        }
      })
      .catch(() => {});
  }, []);

  // Load form data
  function loadFormData(periodId?: string) {
    setLoading(true);
    setSubmitted(false);
    const url = periodId
      ? `/api/functional-plans/${departmentId}?periodId=${periodId}`
      : `/api/functional-plans/${departmentId}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.submission?.status === "SUBMITTED" && !d.isAdmin) {
          setSubmitted(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadFormData(selectedPeriodId || undefined);
  }, [departmentId, selectedPeriodId]);

  // Auto-save function
  const saveDraft = useCallback(
    async (objectives: ObjectiveData[], actions: ActionData[]) => {
      if (submitted) return;
      setSaving(true);
      try {
        await fetch(`/api/functional-plans/${departmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(selectedPeriodId ? { periodId: selectedPeriodId } : {}),
            objectives: objectives.map((o) => ({
              objectiveId: o.id,
              achievedValue: o.achievedValue,
              note: o.note,
            })),
            actions: actions.map((a) => ({
              keyActionId: a.id,
              status: a.status,
              progress: a.progress,
              nextPriority: a.nextPriority,
              blockers: a.blockers,
            })),
          }),
        });
      } catch {
        // Silently fail - will retry on next change
      }
      setSaving(false);
    },
    [departmentId, submitted]
  );

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (objectives: ObjectiveData[], actions: ActionData[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveDraft(objectives, actions);
      }, 800);
    },
    [saveDraft]
  );

  // Update objective field
  function updateObjective(
    id: string,
    field: "achievedValue" | "note",
    value: string
  ) {
    if (!data) return;
    const updated = data.objectives.map((o) =>
      o.id === id ? { ...o, [field]: value } : o
    );
    setData({ ...data, objectives: updated });
    triggerAutoSave(updated, data.actions);
  }

  // Update action field
  function updateAction(
    id: string,
    field: "status" | "progress" | "nextPriority" | "blockers",
    value: string
  ) {
    if (!data) return;
    const updated = data.actions.map((a) =>
      a.id === id ? { ...a, [field]: value } : a
    );
    setData({ ...data, actions: updated });
    triggerAutoSave(data.objectives, updated);
  }

  // Submit
  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    // Save current state first
    await saveDraft(data.objectives, data.actions);
    // Then submit
    const res = await fetch(
      `/api/functional-plans/${departmentId}/submit`,
      { method: "POST" }
    );
    if (res.ok) {
      setSubmitted(true);
      setShowConfirm(false);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[900px]">
          <div className="h-32 rounded-xl border border-border skeleton-shimmer" />
          <div className="mt-6 h-64 rounded-xl border border-border skeleton-shimmer" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 p-8">
        <p className="text-text-sub">Failed to load data.</p>
      </main>
    );
  }

  // Show confirmation success screen (only for function heads after submit)
  if (submitted && data.submission.status === "SUBMITTED" && !data.isAdmin) {
    return (
      <ConfirmationView
        departmentName={data.department.name}
        periodLabel={data.period.label}
        submittedAt={data.submission.submittedAt}
      />
    );
  }

  const readOnly = data.isLocked;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 p-8">
      {/* Admin Period Selector */}
      {data.isAdmin && periods.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-bg-card px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">Period:</span>
          <select
            value={selectedPeriodId || data.period.id}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="rounded-lg border border-border bg-bg-page px-3 py-1.5 text-[13px] font-medium text-text-hd focus:border-brown/40 focus:outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <span className="text-[11px] text-text-mut">
            Submission: <strong className={data.submission.status === "SUBMITTED" ? "text-green" : "text-amber"}>{data.submission.status === "SUBMITTED" ? "Submitted" : "Draft"}</strong>
          </span>
        </div>
      )}

      <SubmissionBanner
        department={data.department}
        period={data.period}
        saving={saving}
      />

      {/* View Only Banner */}
      {data.permission === "VIEW_ONLY" && !data.isAdmin && (
        <div className="mb-6 rounded-xl border border-border bg-bg-mid p-4 text-center">
          <div className="text-[13px] font-semibold text-text-sub">
            You have view-only access to this department. Contact your admin for edit access.
          </div>
        </div>
      )}

      {/* Lock Banner */}
      {data.isLocked && data.permission !== "VIEW_ONLY" && (
        <div className="mb-6 rounded-xl border border-red/20 bg-red-bg p-4 text-center">
          <div className="text-[13px] font-semibold text-red">
            {data.submission.status === "SUBMITTED"
              ? "This report has been submitted and is locked."
              : "The deadline has passed. Updates are no longer accepted."}
          </div>
          {data.submission.submittedAt && (
            <div className="mt-1 text-[11px] text-text-sub">
              Submitted on {new Date(data.submission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}

      {/* Admin indicator */}
      {data.isAdmin && data.submission.status === "SUBMITTED" && (
        <div className="mb-6 rounded-xl border border-info/20 bg-info-bg p-4 text-center">
          <div className="text-[13px] font-semibold text-info">
            Admin mode — You can edit this submission even after it was submitted.
          </div>
        </div>
      )}

      <ObjectivesSection
        objectives={data.objectives}
        readOnly={readOnly}
        onUpdate={updateObjective}
      />

      <ActionsSection
        actions={data.actions}
        readOnly={readOnly}
        onUpdate={updateAction}
      />

      {/* Submit Footer */}
      {!readOnly && (
        <div className="sticky bottom-0 mt-8 flex items-center justify-between rounded-xl border border-border bg-bg-card p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd transition-all duration-200 hover:border-brown/40 hover:text-text-hd"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-[11px] text-text-mut">Saving...</span>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page transition-all duration-200 hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scale-in w-full max-w-md rounded-xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="font-heading text-xl font-bold text-text-hd">
              Confirm Submission
            </h3>
            <p className="mt-2 text-[13px] text-text-sub">
              You are about to submit the {data.department.name} functional plan
              for {data.period.label}. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-border-md px-5 py-2.5 text-[13px] font-semibold text-text-bd transition-all duration-200 hover:border-brown/40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page transition-all duration-200 hover:bg-brown-dk disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
