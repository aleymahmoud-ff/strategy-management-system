import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const UNITS = ["%", "SAR", "USD", "EGP", "count", "days", "score", "ratio", "per-n", "hours", "incidents", "leads", "clients", "custom"];
const DIRECTIONS = [">=", ">", "<=", "<", "="];
const PERIODS = ["MONTHLY", "QUARTERLY", "HALF_ANNUAL", "ANNUAL"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY"];

function addDropdown(ws: XLSX.WorkSheet, ref: string, values: string[]) {
  if (!ws["!dataValidation"]) (ws as Record<string, unknown>)["!dataValidation"] = [];
  (ws["!dataValidation"] as unknown[]).push({
    ref,
    type: "list",
    formula1: `"${values.join(",")}"`,
  });
}

// GET: Download Excel template with dropdowns populated from tenant data
export async function GET() {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const departments = await prisma.department.findMany({
    where: orgWhere,
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });

  const deptNames = departments.map((d) => d.name);
  const MAX_ROWS = 200; // Pre-apply validation for up to 200 rows

  // ── Objectives Sheet ──
  const objectivesHeaders = [
    "Department", "Mode (add/replace)", "Statement", "Unit", "Target Direction",
    "Target Period", "Tracking Period",
    "Jan Baseline", "Feb Baseline", "Mar Baseline", "Apr Baseline", "May Baseline", "Jun Baseline",
    "Jul Baseline", "Aug Baseline", "Sep Baseline", "Oct Baseline", "Nov Baseline", "Dec Baseline",
    "Jan Target", "Feb Target", "Mar Target", "Apr Target", "May Target", "Jun Target",
    "Jul Target", "Aug Target", "Sep Target", "Oct Target", "Nov Target", "Dec Target",
  ];

  const objectivesData = [
    objectivesHeaders,
    [deptNames[0] || "Department Name", "add", "Increase revenue by 15%", "%", ">=", "MONTHLY", "MONTHLY",
     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
     1.2, 2.5, 3.8, 5.0, 6.3, 7.5, 8.8, 10.0, 11.3, 12.5, 13.8, 15],
    [deptNames[0] || "Department Name", "add", "Reduce turnaround to 2 days", "days", "<=", "MONTHLY", "MONTHLY",
     4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5,
     4.2, 4.0, 3.8, 3.5, 3.3, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 2.0],
  ];

  const wsObj = XLSX.utils.aoa_to_sheet(objectivesData);
  wsObj["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ...Array(24).fill({ wch: 12 }),
  ];

  // Add data validation (dropdowns) for each column
  for (let r = 2; r <= MAX_ROWS; r++) {
    // Column A: Department
    addDropdown(wsObj, `A${r}`, deptNames);
    // Column B: Mode
    addDropdown(wsObj, `B${r}`, ["add", "replace"]);
    // Column D: Unit
    addDropdown(wsObj, `D${r}`, UNITS);
    // Column E: Target Direction
    addDropdown(wsObj, `E${r}`, DIRECTIONS);
    // Column F: Target Period
    addDropdown(wsObj, `F${r}`, PERIODS);
    // Column G: Tracking Period
    addDropdown(wsObj, `G${r}`, PERIODS);
  }

  // ── Actions Sheet ──
  const actionsHeaders = ["Department", "Mode (add/replace)", "Description", "Due Date", "Owner", "Frequency"];
  const actionsData = [
    actionsHeaders,
    [deptNames[0] || "Department Name", "add", "Launch Q1 outreach campaign", "2026-03-31", "John Smith", "MONTHLY"],
    [deptNames[0] || "Department Name", "add", "Onboard new sales reps", "2026-04-15", "Jane Doe", "QUARTERLY"],
  ];

  const wsAct = XLSX.utils.aoa_to_sheet(actionsData);
  wsAct["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 45 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

  for (let r = 2; r <= MAX_ROWS; r++) {
    addDropdown(wsAct, `A${r}`, deptNames);
    addDropdown(wsAct, `B${r}`, ["add", "replace"]);
    addDropdown(wsAct, `F${r}`, FREQUENCIES);
  }

  // ── Reference Sheet ──
  const referenceData: (string | number)[][] = [
    ["Field", "Valid Values", "Description"],
    ["Department", "", "Your organization's departments (see dropdown)"],
    ["Mode", "add, replace", "add = create new if not exists, skip if exists. replace = update if exists, create if not."],
    ["Unit", UNITS.join(", "), "Unit of measure for the objective"],
    ["Target Direction", DIRECTIONS.join(", "), ">= higher is better, <= lower is better, = exact match"],
    ["Target Period", PERIODS.join(", "), "How often targets are set"],
    ["Tracking Period", PERIODS.join(", "), "How often actuals are reported (must be same or more frequent than target)"],
    ["Frequency", FREQUENCIES.join(", "), "How often the action is tracked"],
    ["Due Date", "YYYY-MM-DD", "e.g. 2026-03-31"],
    [],
    ["Your Departments:"],
  ];
  for (const name of deptNames) {
    referenceData.push(["", name]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(referenceData);
  wsRef["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 50 }];

  // ── Build Workbook ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsObj, "Objectives");
  XLSX.utils.book_append_sheet(wb, wsAct, "Actions");
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=objectives-actions-template.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
