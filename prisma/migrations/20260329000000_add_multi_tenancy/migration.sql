-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Organization slug unique
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Insert default organization for existing data (Client 1)
INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('org_default_client1', 'Client 1', 'client-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add organizationId to User (nullable first)
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;

-- Add organizationId to Department (nullable first)
ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;

-- Add organizationId to Period (nullable first)
ALTER TABLE "Period" ADD COLUMN "organizationId" TEXT;

-- Backfill all existing rows to default org
UPDATE "User" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL;
UPDATE "Department" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL;
UPDATE "Period" SET "organizationId" = 'org_default_client1' WHERE "organizationId" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Period" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Period" ADD CONSTRAINT "Period_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old unique constraints
DROP INDEX IF EXISTS "Department_slug_key";
DROP INDEX IF EXISTS "Period_year_month_key";

-- Add new org-scoped unique constraints
CREATE UNIQUE INDEX "Department_organizationId_slug_key" ON "Department"("organizationId", "slug");
CREATE UNIQUE INDEX "Period_organizationId_year_month_key" ON "Period"("organizationId", "year", "month");

-- Add indexes for performance
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
CREATE INDEX "Period_organizationId_idx" ON "Period"("organizationId");
