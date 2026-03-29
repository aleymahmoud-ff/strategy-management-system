import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const UNITS = ["%", "SAR", "USD", "EGP", "count", "days", "score", "ratio", "per-n", "hours", "incidents", "leads", "clients", "custom"];
const DIRECTIONS = [">=", ">", "<=", "<", "="];
const PERIODS = ["MONTHLY", "QUARTERLY", "HALF_ANNUAL", "ANNUAL"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY"];
const MODES = ["add", "replace"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function applyDropdown(col: Partial<ExcelJS.Column>, ws: ExcelJS.Worksheet, colIdx: number, values: string[], rowCount: number) {
  for (let r = 2; r <= rowCount; r++) {
    ws.getCell(r, colIdx).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${values.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Must be one of: ${values.join(", ")}`,
    };
  }
}

export async function GET() {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const departments = await prisma.department.findMany({
    where: orgWhere,
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  const deptNames = departments.map((d) => d.name);
  const MAX_ROWS = 200;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Strategy Management System";

  // ── Objectives Sheet ──
  const wsObj = wb.addWorksheet("Objectives");

  const objHeaders = [
    "Department", "Mode", "Statement", "Unit", "Target Direction",
    "Target Period", "Tracking Period",
    ...MONTHS.map((m) => `${m} Baseline`),
    ...MONTHS.map((m) => `${m} Target`),
  ];

  wsObj.columns = objHeaders.map((h, i) => ({
    header: h,
    key: h,
    width: i === 0 ? 22 : i === 1 ? 12 : i === 2 ? 40 : i <= 6 ? 16 : 12,
  }));

  // Style header row
  wsObj.getRow(1).font = { bold: true, size: 11 };
  wsObj.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1F38" } };
  wsObj.getRow(1).font = { bold: true, color: { argb: "FFEDE8DC" }, size: 10 };

  // Example rows
  wsObj.addRow([
    deptNames[0] || "Department", "add", "Increase revenue by 15%", "%", ">=", "MONTHLY", "MONTHLY",
    ...Array(12).fill(0),
    1.2, 2.5, 3.8, 5.0, 6.3, 7.5, 8.8, 10.0, 11.3, 12.5, 13.8, 15,
  ]);
  wsObj.addRow([
    deptNames[0] || "Department", "add", "Reduce turnaround to 2 days", "days", "<=", "MONTHLY", "MONTHLY",
    ...Array(12).fill(4.5),
    4.2, 4.0, 3.8, 3.5, 3.3, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 2.0,
  ]);

  // Apply dropdowns
  if (deptNames.length > 0) applyDropdown({}, wsObj, 1, deptNames, MAX_ROWS);  // Department
  applyDropdown({}, wsObj, 2, MODES, MAX_ROWS);       // Mode
  applyDropdown({}, wsObj, 4, UNITS, MAX_ROWS);        // Unit
  applyDropdown({}, wsObj, 5, DIRECTIONS, MAX_ROWS);   // Target Direction
  applyDropdown({}, wsObj, 6, PERIODS, MAX_ROWS);      // Target Period
  applyDropdown({}, wsObj, 7, PERIODS, MAX_ROWS);      // Tracking Period

  // ── Actions Sheet ──
  const wsAct = wb.addWorksheet("Actions");

  wsAct.columns = [
    { header: "Department", key: "Department", width: 22 },
    { header: "Mode", key: "Mode", width: 12 },
    { header: "Description", key: "Description", width: 45 },
    { header: "Due Date", key: "Due Date", width: 15 },
    { header: "Owner", key: "Owner", width: 20 },
    { header: "Frequency", key: "Frequency", width: 15 },
  ];

  wsAct.getRow(1).font = { bold: true, color: { argb: "FFEDE8DC" }, size: 10 };
  wsAct.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1F38" } };

  wsAct.addRow([deptNames[0] || "Department", "add", "Launch Q1 outreach campaign", "2026-03-31", "John Smith", "MONTHLY"]);
  wsAct.addRow([deptNames[0] || "Department", "add", "Onboard new sales reps", "2026-04-15", "Jane Doe", "QUARTERLY"]);

  if (deptNames.length > 0) applyDropdown({}, wsAct, 1, deptNames, MAX_ROWS);
  applyDropdown({}, wsAct, 2, MODES, MAX_ROWS);
  applyDropdown({}, wsAct, 6, FREQUENCIES, MAX_ROWS);

  // ── Reference Sheet ──
  const wsRef = wb.addWorksheet("Reference");

  wsRef.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Valid Values", key: "values", width: 60 },
    { header: "Description", key: "desc", width: 50 },
  ];

  wsRef.getRow(1).font = { bold: true, color: { argb: "FFEDE8DC" }, size: 10 };
  wsRef.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1F38" } };

  wsRef.addRow(["Mode", "add, replace", "add = skip if exists. replace = update if exists."]);
  wsRef.addRow(["Unit", UNITS.join(", "), "Unit of measure"]);
  wsRef.addRow(["Target Direction", DIRECTIONS.join(", "), ">= higher is better, <= lower is better"]);
  wsRef.addRow(["Target Period", PERIODS.join(", "), "How often targets are set"]);
  wsRef.addRow(["Tracking Period", PERIODS.join(", "), "How often actuals are reported"]);
  wsRef.addRow(["Frequency", FREQUENCIES.join(", "), "How often the action is tracked"]);
  wsRef.addRow(["Due Date", "YYYY-MM-DD", "e.g. 2026-03-31"]);
  wsRef.addRow([]);
  wsRef.addRow(["Your Departments:"]);
  for (const name of deptNames) {
    wsRef.addRow(["", name]);
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=objectives-actions-template.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
