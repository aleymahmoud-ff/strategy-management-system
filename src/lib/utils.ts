import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  COMPLETE: { text: "text-info", bg: "bg-info-bg" },
  ON_TRACK: { text: "text-green", bg: "bg-green-bg" },
  AT_RISK: { text: "text-amber", bg: "bg-amber-bg" },
  NOT_STARTED: { text: "text-text-mut", bg: "bg-bg-mid" },
  BLOCKED: { text: "text-red", bg: "bg-red-bg" },
  DEFERRED: { text: "text-blush-dk", bg: "bg-bg-mid" },
};

export const STATUS_LABELS: Record<string, string> = {
  COMPLETE: "Complete",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  NOT_STARTED: "Not Started",
  BLOCKED: "Blocked",
  DEFERRED: "Deferred",
};

export function computeProgress(achieved: string, target: string): number {
  const a = parseFloat(achieved);
  const t = parseFloat(target);
  if (isNaN(a) || isNaN(t) || t === 0) return 0;
  return Math.min(100, Math.round((a / t) * 100));
}

export function deriveStatus(progress: number): string {
  if (progress >= 100) return "COMPLETE";
  if (progress >= 70) return "ON_TRACK";
  if (progress >= 50) return "AT_RISK";
  return "OFF_TRACK";
}

export type Deviation = {
  division: string;
  objective: string;
  actual: string;
  target: string;
  gap: string;
  severity: "red" | "amber";
};

export function computeDeviations(
  entries: Array<{
    achievedValue: string;
    objective: { statement: string; target: string; division: { name: string } };
  }>
): Deviation[] {
  const deviations: Deviation[] = [];
  for (const entry of entries) {
    const achieved = parseFloat(entry.achievedValue);
    const target = parseFloat(entry.objective.target);
    if (isNaN(achieved) || isNaN(target) || target === 0) continue;
    const progress = (achieved / target) * 100;
    if (progress < 80) {
      deviations.push({
        division: entry.objective.division.name,
        objective: entry.objective.statement,
        actual: entry.achievedValue,
        target: entry.objective.target,
        gap: `${Math.round(progress - 100)}%`,
        severity: progress < 50 ? "red" : "amber",
      });
    }
  }
  return deviations;
}
