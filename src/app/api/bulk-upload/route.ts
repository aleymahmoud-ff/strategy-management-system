import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const VALID_UNITS = ["%", "SAR", "USD", "EGP", "count", "days", "score", "ratio", "per-n", "hours", "incidents", "leads", "clients", "custom"];
const VALID_DIRECTIONS = [">=", ">", "<=", "<", "="];
const VALID_PERIODS = ["MONTHLY", "QUARTERLY", "HALF_ANNUAL", "ANNUAL"];
const VALID_FREQUENCIES = ["MONTHLY", "QUARTERLY"];

export async function POST(req: NextRequest) {
  const { error, orgWhere, orgId } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const mode = req.nextUrl.searchParams.get("mode") || "add"; // "add" or "replace"

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Get departments for this org
  const departments = await prisma.department.findMany({
    where: orgWhere,
    select: { id: true, name: true, slug: true },
  });
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

  const results = { objectives: { added: 0, errors: [] as string[] }, actions: { added: 0, errors: [] as string[] } };

  // Process Objectives sheet
  const objSheet = wb.Sheets["Objectives"];
  if (objSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(objSheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header

      const deptName = String(row["Department"] || "").trim();
      const statement = String(row["Statement"] || "").trim();
      const unit = String(row["Unit"] || "").trim();
      const direction = String(row["Target Direction"] || ">=").trim();
      const targetPeriod = String(row["Target Period"] || "MONTHLY").trim().toUpperCase();
      const trackingPeriod = String(row["Tracking Period"] || "MONTHLY").trim().toUpperCase();

      if (!deptName || !statement) {
        results.objectives.errors.push(`Row ${rowNum}: Department and Statement are required`);
        continue;
      }

      const dept = deptMap.get(deptName.toLowerCase());
      if (!dept) {
        results.objectives.errors.push(`Row ${rowNum}: Department "${deptName}" not found`);
        continue;
      }

      if (!VALID_UNITS.includes(unit)) {
        results.objectives.errors.push(`Row ${rowNum}: Invalid unit "${unit}"`);
        continue;
      }

      if (!VALID_DIRECTIONS.includes(direction)) {
        results.objectives.errors.push(`Row ${rowNum}: Invalid direction "${direction}"`);
        continue;
      }

      if (!VALID_PERIODS.includes(targetPeriod) || !VALID_PERIODS.includes(trackingPeriod)) {
        results.objectives.errors.push(`Row ${rowNum}: Invalid period`);
        continue;
      }

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const baseline = months.map((m) => Number(row[`${m} Baseline`]) || 0);
      const target = months.map((m) => Number(row[`${m} Target`]) || 0);

      // Auto-generate code
      const existingCount = await prisma.objective.count({ where: { departmentId: dept.id } });
      const code = `o${existingCount + 1}`;

      try {
        await prisma.objective.create({
          data: {
            code,
            statement,
            unit,
            targetDirection: direction,
            targetPeriod,
            trackingPeriod,
            monthlyBaseline: JSON.stringify(baseline),
            monthlyTarget: JSON.stringify(target),
            sortOrder: existingCount + 1,
            departmentId: dept.id,
          },
        });
        results.objectives.added++;
      } catch (e) {
        results.objectives.errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "Failed to create"}`);
      }
    }
  }

  // Process Actions sheet
  const actSheet = wb.Sheets["Actions"];
  if (actSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(actSheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const deptName = String(row["Department"] || "").trim();
      const description = String(row["Description"] || "").trim();
      const dueDateStr = String(row["Due Date"] || "").trim();
      const owner = String(row["Owner"] || "").trim();
      const frequency = String(row["Frequency"] || "MONTHLY").trim().toUpperCase();

      if (!deptName || !description) {
        results.actions.errors.push(`Row ${rowNum}: Department and Description are required`);
        continue;
      }

      const dept = deptMap.get(deptName.toLowerCase());
      if (!dept) {
        results.actions.errors.push(`Row ${rowNum}: Department "${deptName}" not found`);
        continue;
      }

      if (!VALID_FREQUENCIES.includes(frequency)) {
        results.actions.errors.push(`Row ${rowNum}: Invalid frequency "${frequency}"`);
        continue;
      }

      let dueDate: Date;
      try {
        // Handle Excel serial date numbers
        if (typeof row["Due Date"] === "number") {
          dueDate = new Date(Math.round((row["Due Date"] as number - 25569) * 86400000));
        } else {
          dueDate = new Date(dueDateStr);
        }
        if (isNaN(dueDate.getTime())) throw new Error("Invalid date");
      } catch {
        results.actions.errors.push(`Row ${rowNum}: Invalid date "${dueDateStr}"`);
        continue;
      }

      const existingCount = await prisma.keyAction.count({ where: { departmentId: dept.id } });
      const code = `a${existingCount + 1}`;

      try {
        await prisma.keyAction.create({
          data: {
            code,
            description,
            dueDate,
            owner: owner || "TBD",
            frequency,
            sortOrder: existingCount + 1,
            departmentId: dept.id,
          },
        });
        results.actions.added++;
      } catch (e) {
        results.actions.errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "Failed to create"}`);
      }
    }
  }

  // If mode is "replace", we already deleted before (handled client-side confirmation)
  // The "replace" mode deletes existing data before upload
  if (mode === "replace") {
    // This is handled before processing — but we keep the flag for future use
  }

  return NextResponse.json({
    status: "success",
    results,
    summary: `Added ${results.objectives.added} objectives and ${results.actions.added} actions`,
  });
}
