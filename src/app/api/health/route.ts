import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userCount = await prisma.user.count();

    // Check if Organization table exists and has data
    let orgCount = 0;
    let superAdminExists = false;
    let migrationStatus = "unknown";
    try {
      orgCount = await prisma.organization.count();
      migrationStatus = "applied";
    } catch {
      migrationStatus = "not_applied";
    }

    try {
      const sa = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
      superAdminExists = !!sa;
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: "ok",
      database: "connected",
      users: userCount,
      organizations: orgCount,
      migrationStatus,
      superAdminExists,
      dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@") ?? "not set",
    });
  } catch (e) {
    return NextResponse.json({
      status: "error",
      database: "failed",
      error: e instanceof Error ? e.message : String(e),
      dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@") ?? "not set",
    }, { status: 500 });
  }
}
