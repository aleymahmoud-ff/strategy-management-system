import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// One-time setup endpoint: creates Organization table, backfills data, creates super admin
// DELETE THIS FILE after successful setup
export async function POST() {
  const results: string[] = [];

  try {
    // Step 1: Check if Organization table already exists
    const tableCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Organization'
      )`;

    if (tableCheck[0]?.exists) {
      results.push("Organization table already exists, skipping creation");
    } else {
      // Create Organization table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Organization" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug")`);
      results.push("Created Organization table");
    }

    // Step 2: Insert default org if none exists
    const orgCount = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM "Organization"`;
    if (Number(orgCount[0].count) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
        VALUES ('org_default_client1', 'Client 1', 'client-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      results.push("Created default organization (Client 1)");
    } else {
      results.push("Organizations already exist, skipping default org");
    }

    // Step 3: Add organizationId to User if not exists
    const userColCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'organizationId'
      )`;

    if (!userColCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "organizationId" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL AND role != 'SUPER_ADMIN'`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "User_organizationId_idx" ON "User"("organizationId")`);
      results.push("Added organizationId to User table");
    } else {
      results.push("User.organizationId already exists");
    }

    // Step 4: Add organizationId to Department if not exists
    const deptColCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'Department' AND column_name = 'organizationId'
      )`;

    if (!deptColCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "Department" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      // Drop old unique and add new compound unique
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Department_slug_key"`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Department_organizationId_slug_key" ON "Department"("organizationId", "slug")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId")`);
      results.push("Added organizationId to Department table");
    } else {
      results.push("Department.organizationId already exists");
    }

    // Step 5: Add organizationId to Period if not exists
    const periodColCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'Period' AND column_name = 'organizationId'
      )`;

    if (!periodColCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Period" ADD COLUMN "organizationId" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "Period" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Period" ALTER COLUMN "organizationId" SET NOT NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Period" ADD CONSTRAINT "Period_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Period_year_month_key"`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Period_organizationId_year_month_key" ON "Period"("organizationId", "year", "month")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "Period_organizationId_idx" ON "Period"("organizationId")`);
      results.push("Added organizationId to Period table");
    } else {
      results.push("Period.organizationId already exists");
    }

    // Step 6: Backfill any users without organizationId (except SUPER_ADMIN)
    await prisma.$executeRawUnsafe(`UPDATE "User" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL AND role != 'SUPER_ADMIN'`);
    results.push("Backfilled organizationId for existing users");

    // Step 7: Create SUPER_ADMIN if not exists
    const saCheck = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM "User" WHERE role = 'SUPER_ADMIN'`;
    if (Number(saCheck[0].count) === 0) {
      const passwordHash = await bcrypt.hash("SuperAdmin2026!", 12);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" ("id", "email", "username", "name", "passwordHash", "role", "createdAt", "updatedAt")
        VALUES (
          'sa_' || substr(md5(random()::text), 1, 20),
          'superadmin@sms.local',
          'superadmin',
          'Super Admin',
          '${passwordHash}',
          'SUPER_ADMIN',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);
      results.push("Created SUPER_ADMIN user (superadmin@sms.local / SuperAdmin2026!)");
    } else {
      results.push("SUPER_ADMIN already exists");
    }

    return NextResponse.json({ status: "success", results });
  } catch (e) {
    return NextResponse.json({
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      results,
    }, { status: 500 });
  }
}
