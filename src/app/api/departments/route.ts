import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headName: z.string().min(1, "Head name is required"),
  initials: z.string().min(1).max(5, "Initials must be 1-5 characters"),
});

// GET: List all departments
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { objectives: true, keyActions: true, users: true, submissions: true } },
    },
  });

  return NextResponse.json(departments);
}

// POST: Create a new department
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, headName, initials } = parsed.data;

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Check for duplicate slug
  const existing = await prisma.department.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A department with a similar name already exists" }, { status: 409 });
  }

  // Get next sort order
  const maxOrder = await prisma.department.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  const department = await prisma.department.create({
    data: { name, slug, headName, initials: initials.toUpperCase(), sortOrder },
  });

  return NextResponse.json(department, { status: 201 });
}

// PUT: Update a department
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, headName, initials } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (headName) data.headName = headName;
  if (initials) data.initials = initials.toUpperCase();

  const department = await prisma.department.update({ where: { id }, data });

  return NextResponse.json(department);
}

// DELETE: Remove a department (only if no submissions exist)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Check for submissions
  const submissionCount = await prisma.submission.count({ where: { departmentId: id } });
  if (submissionCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a department that has submissions. Remove all submissions first." },
      { status: 400 }
    );
  }

  // Delete related objectives and key actions first
  await prisma.objective.deleteMany({ where: { departmentId: id } });
  await prisma.keyAction.deleteMany({ where: { departmentId: id } });
  // Unassign users from this department
  await prisma.user.updateMany({ where: { departmentId: id }, data: { departmentId: null } });

  await prisma.department.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
