import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const periodSchema = z.object({
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  deadline: z.string().min(1, "Deadline is required"),
  isActive: z.boolean().default(false),
});

// GET: List all periods
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periods = await prisma.period.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      _count: { select: { submissions: true } },
      submissions: {
        select: { status: true },
      },
    },
  });

  const data = periods.map((p) => ({
    id: p.id,
    label: p.label,
    year: p.year,
    month: p.month,
    deadline: p.deadline.toISOString(),
    isActive: p.isActive,
    totalSubmissions: p._count.submissions,
    submittedCount: p.submissions.filter((s) => s.status === "SUBMITTED").length,
  }));

  return NextResponse.json(data);
}

// POST: Create period
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = periodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.period.findUnique({
    where: { year_month: { year: parsed.data.year, month: parsed.data.month } },
  });
  if (existing) {
    return NextResponse.json({ error: "Period already exists" }, { status: 409 });
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const label = `${monthNames[parsed.data.month - 1]} ${parsed.data.year}`;

  // If setting as active, deactivate others
  if (parsed.data.isActive) {
    await prisma.period.updateMany({ data: { isActive: false } });
  }

  const period = await prisma.period.create({
    data: {
      label,
      year: parsed.data.year,
      month: parsed.data.month,
      deadline: new Date(parsed.data.deadline),
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json(period, { status: 201 });
}

// PUT: Update period (deadline, active status)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, deadline, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // If setting as active, deactivate others first
  if (isActive) {
    await prisma.period.updateMany({ data: { isActive: false } });
  }

  const period = await prisma.period.update({
    where: { id },
    data: {
      ...(deadline ? { deadline: new Date(deadline) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(period);
}

// DELETE: Delete period (only if no submissions)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const count = await prisma.submission.count({ where: { periodId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Cannot delete period with existing submissions" },
      { status: 400 }
    );
  }

  await prisma.period.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
