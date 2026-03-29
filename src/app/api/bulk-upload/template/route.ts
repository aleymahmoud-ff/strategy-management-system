import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// GET: Download Excel template with department names
export async function GET() {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  // Get departments for this org
  const departments = await prisma.department.findMany({
    where: orgWhere,
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });

  const deptNames = departments.map((d) => d.name);

  // Objectives sheet
  const objectivesData = [
    ["Department", "Statement", "Unit", "Target Direction", "Target Period", "Tracking Period",
     "Jan Baseline", "Feb Baseline", "Mar Baseline", "Apr Baseline", "May Baseline", "Jun Baseline",
     "Jul Baseline", "Aug Baseline", "Sep Baseline", "Oct Baseline", "Nov Baseline", "Dec Baseline",
     "Jan Target", "Feb Target", "Mar Target", "Apr Target", "May Target", "Jun Target",
     "Jul Target", "Aug Target", "Sep Target", "Oct Target", "Nov Target", "Dec Target"],
    // Example row
    [deptNames[0] || "Sales", "Increase revenue by 15%", "%", ">=", "MONTHLY", "MONTHLY",
     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
     1.2, 2.5, 3.8, 5.0, 6.3, 7.5, 8.8, 10.0, 11.3, 12.5, 13.8, 15],
    [deptNames[0] || "Sales", "Reduce turnaround to 2 days", "days", "<=", "MONTHLY", "MONTHLY",
     4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5,
     4.2, 4.0, 3.8, 3.5, 3.3, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 2.0],
  ];

  // Actions sheet
  const actionsData = [
    ["Department", "Description", "Due Date", "Owner", "Frequency"],
    [deptNames[0] || "Sales", "Launch Q1 outreach campaign", "2026-03-31", "John Smith", "MONTHLY"],
    [deptNames[0] || "Sales", "Onboard new sales reps", "2026-04-15", "Jane Doe", "QUARTERLY"],
  ];

  // Reference sheet
  const referenceData = [
    ["Field", "Valid Values"],
    ["Unit", "%, SAR, USD, EGP, count, days, score, ratio, per-n, hours, incidents, leads, clients, custom"],
    ["Target Direction", ">=, >, <=, <, ="],
    ["Target Period", "MONTHLY, QUARTERLY, HALF_ANNUAL, ANNUAL"],
    ["Tracking Period", "MONTHLY, QUARTERLY, HALF_ANNUAL, ANNUAL"],
    ["Frequency", "MONTHLY, QUARTERLY"],
    ["Due Date", "YYYY-MM-DD format"],
    ["Department", deptNames.join(", ") || "Create departments first"],
  ];

  const wb = XLSX.utils.book_new();

  const wsObj = XLSX.utils.aoa_to_sheet(objectivesData);
  wsObj["!cols"] = [
    { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ...Array(24).fill({ wch: 12 }),
  ];
  XLSX.utils.book_append_sheet(wb, wsObj, "Objectives");

  const wsAct = XLSX.utils.aoa_to_sheet(actionsData);
  wsAct["!cols"] = [{ wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsAct, "Actions");

  const wsRef = XLSX.utils.aoa_to_sheet(referenceData);
  wsRef["!cols"] = [{ wch: 20 }, { wch: 80 }];
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
