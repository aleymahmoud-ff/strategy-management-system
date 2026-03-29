import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  owner: z.string().min(1, "Owner is required"),
  frequency: z.enum(["MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  departmentId: z.string().min(1, "Department is required"),
});

export async function GET(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const departmentId = req.nextUrl.searchParams.get("departmentId");

  const actions = await prisma.keyAction.findMany({
    where: { department: orgWhere, ...(departmentId ? { departmentId } : {}) },
    orderBy: [{ departmentId: "asc" }, { sortOrder: "asc" }],
    include: { department: { select: { name: true } } },
  });

  return NextResponse.json(actions);
}

export async function POST(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
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

  const count = await prisma.keyAction.count({
    where: { departmentId: parsed.data.departmentId },
  });

  const action = await prisma.keyAction.create({
    data: {
      code: `a${count + 1}`,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
      owner: parsed.data.owner,
      frequency: parsed.data.frequency,
      departmentId: parsed.data.departmentId,
      sortOrder: count + 1,
    },
  });

  return NextResponse.json(action, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Verify action's department belongs to org
  const existing = await prisma.keyAction.findFirst({
    where: { id, department: orgWhere },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const action = await prisma.keyAction.update({
    where: { id },
    data: {
      description: updateData.description,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      owner: updateData.owner,
      frequency: updateData.frequency,
    },
  });

  return NextResponse.json(action);
}

export async function DELETE(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Verify action's department belongs to org
  const existing = await prisma.keyAction.findFirst({
    where: { id, department: orgWhere },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  await prisma.keyActionEntry.deleteMany({ where: { keyActionId: id } });
  await prisma.keyAction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
