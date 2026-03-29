-- Make organizationId nullable on User (for SUPER_ADMIN users)
ALTER TABLE "User" ALTER COLUMN "organizationId" DROP NOT NULL;
