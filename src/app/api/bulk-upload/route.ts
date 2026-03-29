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
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  const departments = await prisma.department.findMany({
    where: orgWhere,
    select: { id: true, name: true },
  });
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

  const results = {
    objectives: { added: 0, updated: 0, skipped: 0, errors: [] as string[] },
    actions: { added: 0, updated: 0, skipped: 0, errors: [] as string[] },
  };

  // ── Process Objectives ──
  const objSheet = wb.Sheets["Objectives"];
  if (objSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(objSheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const deptName = String(row["Department"] || "").trim();
      const mode = String(row["Mode (add/replace)"] || "add").trim().toLowerCase();
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

      // Check if objective already exists (match by department + statement)
      const existing = await prisma.objective.findFirst({
        where: { departmentId: dept.id, statement },
      });

      try {
        if (existing) {
          if (mode === "replace") {
            await prisma.objective.update({
              where: { id: existing.id },
              data: {
                unit,
                targetDirection: direction,
                targetPeriod,
                trackingPeriod,
                monthlyBaseline: JSON.stringify(baseline),
                monthlyTarget: JSON.stringify(target),
              },
            });
            results.objectives.updated++;
          } else {
            results.objectives.skipped++;
          }
        } else {
          const count = await prisma.objective.count({ where: { departmentId: dept.id } });
          await prisma.objective.create({
            data: {
              code: `o${count + 1}`,
              statement,
              unit,
              targetDirection: direction,
              targetPeriod,
              trackingPeriod,
              monthlyBaseline: JSON.stringify(baseline),
              monthlyTarget: JSON.stringify(target),
              sortOrder: count + 1,
              departmentId: dept.id,
            },
          });
          results.objectives.added++;
        }
      } catch (e) {
        results.objectives.errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }
  }

  // ── Process Actions ──
  const actSheet = wb.Sheets["Actions"];
  if (actSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(actSheet);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const deptName = String(row["Department"] || "").trim();
      const mode = String(row["Mode (add/replace)"] || "add").trim().toLowerCase();
      const description = String(row["Description"] || "").trim();
      const dueDateRaw = row["Due Date"];
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
        if (typeof dueDateRaw === "number") {
          dueDate = new Date(Math.round((dueDateRaw - 25569) * 86400000));
        } else {
          dueDate = new Date(String(dueDateRaw));
        }
        if (isNaN(dueDate.getTime())) throw new Error("Invalid date");
      } catch {
        results.actions.errors.push(`Row ${rowNum}: Invalid date`);
        continue;
      }

      // Check if action already exists (match by department + description)
      const existing = await prisma.keyAction.findFirst({
        where: { departmentId: dept.id, description },
      });

      try {
        if (existing) {
          if (mode === "replace") {
            await prisma.keyAction.update({
              where: { id: existing.id },
              data: { dueDate, owner: owner || "TBD", frequency },
            });
            results.actions.updated++;
          } else {
            results.actions.skipped++;
          }
        } else {
          const count = await prisma.keyAction.count({ where: { departmentId: dept.id } });
          await prisma.keyAction.create({
            data: {
              code: `a${count + 1}`,
              description,
              dueDate,
              owner: owner || "TBD",
              frequency,
              sortOrder: count + 1,
              departmentId: dept.id,
            },
          });
          results.actions.added++;
        }
      } catch (e) {
        results.actions.errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }
  }

  const parts = [];
  if (results.objectives.added) parts.push(`${results.objectives.added} objectives added`);
  if (results.objectives.updated) parts.push(`${results.objectives.updated} objectives updated`);
  if (results.objectives.skipped) parts.push(`${results.objectives.skipped} objectives skipped (already exist)`);
  if (results.actions.added) parts.push(`${results.actions.added} actions added`);
  if (results.actions.updated) parts.push(`${results.actions.updated} actions updated`);
  if (results.actions.skipped) parts.push(`${results.actions.skipped} actions skipped (already exist)`);

  return NextResponse.json({
    status: "success",
    results,
    summary: parts.join(", ") || "No data processed",
  });
}
