import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  owner: z.string().min(1, "Owner is required"),
  frequency: z.enum(["MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  divisionId: z.string().min(1, "Division is required"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const divisionId = req.nextUrl.searchParams.get("divisionId");

  const actions = await prisma.keyAction.findMany({
    where: divisionId ? { divisionId } : undefined,
    orderBy: [{ divisionId: "asc" }, { sortOrder: "asc" }],
    include: { division: { select: { name: true } } },
  });

  return NextResponse.json(actions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await prisma.keyAction.count({
    where: { divisionId: parsed.data.divisionId },
  });

  const action = await prisma.keyAction.create({
    data: {
      code: `a${count + 1}`,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
      owner: parsed.data.owner,
      frequency: parsed.data.frequency,
      divisionId: parsed.data.divisionId,
      sortOrder: count + 1,
    },
  });

  return NextResponse.json(action, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
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
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.keyActionEntry.deleteMany({ where: { keyActionId: id } });
  await prisma.keyAction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
