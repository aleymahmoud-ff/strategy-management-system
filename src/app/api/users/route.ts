import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET: List all users
export async function GET() {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const users = await prisma.user.findMany({
    where: orgWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      departmentId: true,
      department: { select: { name: true } },
      assignments: {
        select: {
          departmentId: true,
          permission: true,
          department: { select: { name: true } },
        },
      },
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

// POST: Create user
export async function POST(req: NextRequest) {
  const { error, orgId } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, name, password, role, departmentId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      departmentId: role === "FUNCTION_HEAD" ? departmentId || null : null,
      organizationId: orgId,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}

// PUT: Update user
export async function PUT(req: NextRequest) {
  const { error, session, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Verify user belongs to org
  const existingUser = await prisma.user.findFirst({ where: { id, ...orgWhere } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const parsed = userUpdateSchema.safeParse(updateData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.email) data.email = parsed.data.email;
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }
  if (parsed.data.departmentId !== undefined) {
    data.departmentId =
      parsed.data.role === "FUNCTION_HEAD" ? parsed.data.departmentId : null;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(user);
}

// DELETE: Delete user
export async function DELETE(req: NextRequest) {
  const { error, session, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  // Verify user belongs to org
  const existingUser = await prisma.user.findFirst({ where: { id, ...orgWhere } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
