import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PERIOD_LENGTHS: Record<string, number> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  HALF_ANNUAL: 2,
  ANNUAL: 1,
};

const PERIOD_ORDER: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 2,
  HALF_ANNUAL: 3,
  ANNUAL: 4,
};

const objectiveSchema = z
  .object({
    statement: z.string().min(1, "Statement is required"),
    unit: z.string().min(1, "Unit is required"),
    targetDirection: z.enum([">", "<", "<=", ">=", "="]),
    targetPeriod: z.enum(["MONTHLY", "QUARTERLY", "HALF_ANNUAL", "ANNUAL"]).default("MONTHLY"),
    trackingPeriod: z.enum(["MONTHLY", "QUARTERLY", "HALF_ANNUAL", "ANNUAL"]).default("MONTHLY"),
    monthlyBaseline: z.array(z.number()),
    monthlyTarget: z.array(z.number()),
    departmentId: z.string().min(1, "Department is required"),
  })
  .refine(
    (data) => PERIOD_ORDER[data.trackingPeriod] <= PERIOD_ORDER[data.targetPeriod],
    { message: "Tracking period must be equal to or more frequent than target period" }
  )
  .refine(
    (data) => data.monthlyBaseline.length === PERIOD_LENGTHS[data.targetPeriod],
    { message: "Baseline array length must match target period" }
  )
  .refine(
    (data) => data.monthlyTarget.length === PERIOD_LENGTHS[data.targetPeriod],
    { message: "Target array length must match target period" }
  );

export async function GET(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const departmentId = req.nextUrl.searchParams.get("departmentId");

  const objectives = await prisma.objective.findMany({
    where: { department: orgWhere, ...(departmentId ? { departmentId } : {}) },
    orderBy: [{ departmentId: "asc" }, { sortOrder: "asc" }],
    include: { department: { select: { name: true, slug: true } } },
  });

  const parsed = objectives.map((o) => ({
    ...o,
    monthlyBaseline: JSON.parse(o.monthlyBaseline),
    monthlyTarget: JSON.parse(o.monthlyTarget),
  }));

  return NextResponse.json(parsed);
}

export async function POST(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const parsed = objectiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify department belongs to org
  const dept = await prisma.department.findFirst({ where: { id: parsed.data.departmentId, ...orgWhere } });
  if (!dept) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const count = await prisma.objective.count({
    where: { departmentId: parsed.data.departmentId },
  });

  const objective = await prisma.objective.create({
    data: {
      code: `o${count + 1}`,
      statement: parsed.data.statement,
      unit: parsed.data.unit,
      targetDirection: parsed.data.targetDirection,
      targetPeriod: parsed.data.targetPeriod,
      trackingPeriod: parsed.data.trackingPeriod,
      monthlyBaseline: JSON.stringify(parsed.data.monthlyBaseline),
      monthlyTarget: JSON.stringify(parsed.data.monthlyTarget),
      departmentId: parsed.data.departmentId,
      sortOrder: count + 1,
    },
  });

  return NextResponse.json(objective, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Verify objective's department belongs to org
  const existing = await prisma.objective.findFirst({
    where: { id, department: orgWhere },
  });
  if (!existing) {
    return NextResponse.json({ error: "Objective not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (updateData.statement) data.statement = updateData.statement;
  if (updateData.unit) data.unit = updateData.unit;
  if (updateData.targetDirection) data.targetDirection = updateData.targetDirection;
  if (updateData.targetPeriod) data.targetPeriod = updateData.targetPeriod;
  if (updateData.trackingPeriod) data.trackingPeriod = updateData.trackingPeriod;
  if (updateData.monthlyBaseline)
    data.monthlyBaseline = JSON.stringify(updateData.monthlyBaseline);
  if (updateData.monthlyTarget)
    data.monthlyTarget = JSON.stringify(updateData.monthlyTarget);

  const objective = await prisma.objective.update({ where: { id }, data });
  return NextResponse.json(objective);
}

export async function DELETE(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Verify objective's department belongs to org
  const existing = await prisma.objective.findFirst({
    where: { id, department: orgWhere },
  });
  if (!existing) {
    return NextResponse.json({ error: "Objective not found" }, { status: 404 });
  }

  await prisma.objectiveEntry.deleteMany({ where: { objectiveId: id } });
  await prisma.objective.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
