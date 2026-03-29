import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Valid email required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

// GET: List all organizations with stats
export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, departments: true, periods: true } },
      users: {
        where: { role: "STRATEGY_MANAGER" },
        select: { id: true, name: true, email: true },
        take: 5,
      },
    },
  });

  return NextResponse.json(orgs);
}

// POST: Create organization with initial Strategy Manager
export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, adminName, adminEmail, adminPassword } = parsed.data;

  // Check slug uniqueness
  const existingOrg = await prisma.organization.findUnique({ where: { slug } });
  if (existingOrg) {
    return NextResponse.json({ error: "An organization with this slug already exists" }, { status: 409 });
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create org + admin user in a transaction
  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      users: {
        create: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: "STRATEGY_MANAGER",
        },
      },
    },
    include: {
      _count: { select: { users: true, departments: true, periods: true } },
      users: {
        where: { role: "STRATEGY_MANAGER" },
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(org, { status: 201 });
}

// PUT: Update organization
export async function PUT(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  // Check slug uniqueness if changing
  if (data.slug) {
    const existing = await prisma.organization.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const org = await prisma.organization.update({
    where: { id },
    data,
  });

  return NextResponse.json(org);
}

// DELETE: Delete organization (only if empty)
export async function DELETE(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const counts = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, departments: true } },
    },
  });

  if (!counts) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (counts._count.users > 0 || counts._count.departments > 0) {
    return NextResponse.json(
      { error: "Cannot delete organization with existing users or departments. Remove them first." },
      { status: 400 }
    );
  }

  // Delete periods first (they have no cascade)
  await prisma.period.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
