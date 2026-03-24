import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headName: z.string().min(1, "Head name is required"),
  initials: z.string().min(1).max(5, "Initials must be 1-5 characters"),
});

// GET: List all divisions
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const divisions = await prisma.division.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { objectives: true, keyActions: true, users: true, submissions: true } },
    },
  });

  return NextResponse.json(divisions);
}

// POST: Create a new division
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
  const existing = await prisma.division.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A division with a similar name already exists" }, { status: 409 });
  }

  // Get next sort order
  const maxOrder = await prisma.division.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  const division = await prisma.division.create({
    data: { name, slug, headName, initials: initials.toUpperCase(), sortOrder },
  });

  return NextResponse.json(division, { status: 201 });
}

// PUT: Update a division
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

  const division = await prisma.division.update({ where: { id }, data });

  return NextResponse.json(division);
}

// DELETE: Remove a division (only if no submissions exist)
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
  const submissionCount = await prisma.submission.count({ where: { divisionId: id } });
  if (submissionCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a division that has submissions. Remove all submissions first." },
      { status: 400 }
    );
  }

  // Delete related objectives and key actions first
  await prisma.objective.deleteMany({ where: { divisionId: id } });
  await prisma.keyAction.deleteMany({ where: { divisionId: id } });
  // Unassign users from this division
  await prisma.user.updateMany({ where: { divisionId: id }, data: { divisionId: null } });

  await prisma.division.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
