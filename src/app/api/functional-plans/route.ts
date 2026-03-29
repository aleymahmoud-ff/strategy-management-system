import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, session, orgWhere } = await getTenantSession();
  if (error) return error;

  if (session.user.role === "EXECUTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = await prisma.period.findFirst({ where: { isActive: true, ...orgWhere } });
  if (!period) {
    return NextResponse.json({ error: "No active period" }, { status: 404 });
  }

  const departments = await prisma.department.findMany({
    where: orgWhere,
    orderBy: { sortOrder: "asc" },
    include: {
      objectives: true,
      submissions: {
        where: { periodId: period.id },
        select: { status: true, submittedAt: true },
      },
    },
  });

  const data = departments.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    headName: d.headName,
    initials: d.initials,
    objectiveCount: d.objectives.length,
    submissionStatus: d.submissions[0]?.status || null,
    submittedAt: d.submissions[0]?.submittedAt?.toISOString() || null,
  }));

  return NextResponse.json({ period, departments: data });
}
