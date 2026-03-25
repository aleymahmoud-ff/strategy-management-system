import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      users: userCount,
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
