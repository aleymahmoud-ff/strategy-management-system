const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Check if a SUPER_ADMIN already exists
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("SUPER_ADMIN already exists:", existing.email);
    return;
  }

  // Create SUPER_ADMIN user (no organization)
  const passwordHash = await bcrypt.hash("SuperAdmin2026!", 12);
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@sms.local",
      username: "superadmin",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      // organizationId is null for SUPER_ADMIN
    },
  });

  console.log("SUPER_ADMIN created:");
  console.log("  Email: superadmin@sms.local");
  console.log("  Username: superadmin");
  console.log("  Password: SuperAdmin2026!");
  console.log("  ID:", superAdmin.id);
}

main()
  .catch((e) => {
    console.error("Setup error:", e.message);
    // Don't exit with error — allow deployment to continue
  })
  .finally(() => prisma.$disconnect());
