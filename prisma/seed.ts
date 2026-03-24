import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper: create 12-month array with a base value and optional variance
function monthly(base: number, variance = 0): string {
  return JSON.stringify(
    Array.from({ length: 12 }, (_, i) =>
      Math.round((base + (variance * (i + 1)) / 12) * 10) / 10
    )
  );
}

// Helper: flat monthly target (same value each month)
function flat(val: number): string {
  return JSON.stringify(Array(12).fill(val));
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data (ignore errors on fresh DB)
  await prisma.keyActionEntry.deleteMany().catch(() => {});
  await prisma.objectiveEntry.deleteMany().catch(() => {});
  await prisma.submission.deleteMany().catch(() => {});
  await prisma.keyAction.deleteMany().catch(() => {});
  await prisma.objective.deleteMany().catch(() => {});
  await prisma.userDepartment.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.department.deleteMany().catch(() => {});
  await prisma.period.deleteMany().catch(() => {});

  // Period
  const period = await prisma.period.create({
    data: {
      label: "March 2026",
      year: 2026,
      month: 3,
      deadline: new Date("2026-03-07T23:59:59Z"),
      isActive: true,
    },
  });

  // Departments
  const [ops, fin, hr, tech, sales, mkt] = await Promise.all([
    prisma.department.create({ data: { slug: "ops", name: "Operations", headName: "Sarah K.", initials: "SK", sortOrder: 1 } }),
    prisma.department.create({ data: { slug: "fin", name: "Finance", headName: "James M.", initials: "JM", sortOrder: 2 } }),
    prisma.department.create({ data: { slug: "hr", name: "Human Resources", headName: "Layla A.", initials: "LA", sortOrder: 3 } }),
    prisma.department.create({ data: { slug: "tech", name: "Technology", headName: "Rami H.", initials: "RH", sortOrder: 4 } }),
    prisma.department.create({ data: { slug: "sales", name: "Commercial", headName: "Omar T.", initials: "OT", sortOrder: 5 } }),
    prisma.department.create({ data: { slug: "mkt", name: "Marketing", headName: "Nora S.", initials: "NS", sortOrder: 6 } }),
  ]);

  // ─── Objectives (with 12-month baselines & targets) ─────────

  // Operations
  const opsObj = await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Reduce operational cost by 12%", unit: "%",
        targetDirection: ">=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(0),
        monthlyTarget: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        sortOrder: 1, departmentId: ops.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Achieve 98% on-time delivery rate", unit: "%",
        targetDirection: ">=", trackingPeriod: "QUARTERLY",
        monthlyBaseline: flat(92),
        monthlyTarget: JSON.stringify([93, 93.5, 94, 94.5, 95, 95.5, 96, 96.5, 97, 97.5, 98, 98]),
        sortOrder: 2, departmentId: ops.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o3", statement: "Reduce average turnaround time to 2 days", unit: "days",
        targetDirection: "<=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(4.5),
        monthlyTarget: JSON.stringify([4.2, 4.0, 3.8, 3.5, 3.3, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 2.0]),
        sortOrder: 3, departmentId: ops.id,
      },
    }),
  ]);

  // Finance
  const finObj = await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Complete ERP implementation (Phase 2)", unit: "%",
        targetDirection: ">=", trackingPeriod: "QUARTERLY",
        monthlyBaseline: flat(20),
        monthlyTarget: JSON.stringify([25, 32, 40, 48, 55, 62, 70, 78, 85, 90, 95, 100]),
        sortOrder: 1, departmentId: fin.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Reduce monthly close cycle to 5 days", unit: "days",
        targetDirection: "<=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(12),
        monthlyTarget: JSON.stringify([11.5, 11, 10.5, 10, 9.5, 9, 8, 7, 6.5, 6, 5.5, 5]),
        sortOrder: 2, departmentId: fin.id,
      },
    }),
  ]);

  // HR
  const hrObj = await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Reduce attrition rate to below 8%", unit: "%",
        targetDirection: "<=", trackingPeriod: "HALF_ANNUAL",
        monthlyBaseline: flat(14),
        monthlyTarget: JSON.stringify([13.5, 13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8]),
        sortOrder: 1, departmentId: hr.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Build leadership pipeline — 80% key roles with successors", unit: "%",
        targetDirection: ">=",
        monthlyBaseline: flat(45),
        monthlyTarget: JSON.stringify([48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 80]),
        sortOrder: 2, departmentId: hr.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o3", statement: "Launch employee engagement program", unit: "%",
        targetDirection: ">=",
        monthlyBaseline: flat(0),
        monthlyTarget: JSON.stringify([5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]),
        sortOrder: 3, departmentId: hr.id,
      },
    }),
  ]);

  // Technology
  const techObj = await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Deploy cloud migration Phase 2", unit: "%",
        targetDirection: ">=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(30),
        monthlyTarget: JSON.stringify([35, 42, 50, 55, 62, 70, 75, 82, 88, 93, 97, 100]),
        sortOrder: 1, departmentId: tech.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Zero critical security incidents", unit: "incidents",
        targetDirection: "<=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(0),
        monthlyTarget: flat(0),
        sortOrder: 2, departmentId: tech.id,
      },
    }),
  ]);

  // Commercial
  await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Grow revenue by 15% YoY", unit: "%",
        targetDirection: ">=", trackingPeriod: "QUARTERLY",
        monthlyBaseline: flat(0),
        monthlyTarget: JSON.stringify([1.2, 2.5, 3.8, 5.0, 6.3, 7.5, 8.8, 10.0, 11.3, 12.5, 13.8, 15]),
        sortOrder: 1, departmentId: sales.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Acquire 50 new enterprise clients", unit: "clients",
        targetDirection: ">=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(0),
        monthlyTarget: JSON.stringify([4, 8, 12, 17, 21, 25, 29, 33, 38, 42, 46, 50]),
        sortOrder: 2, departmentId: sales.id,
      },
    }),
  ]);

  // Marketing
  await Promise.all([
    prisma.objective.create({
      data: {
        code: "o1", statement: "Increase brand awareness score to 72%", unit: "%",
        targetDirection: ">=", trackingPeriod: "ANNUAL",
        monthlyBaseline: flat(58),
        monthlyTarget: JSON.stringify([59, 60, 61.5, 63, 64, 65.5, 67, 68, 69.5, 70.5, 71, 72]),
        sortOrder: 1, departmentId: mkt.id,
      },
    }),
    prisma.objective.create({
      data: {
        code: "o2", statement: "Generate 200 qualified leads per month", unit: "leads",
        targetDirection: ">=", trackingPeriod: "MONTHLY",
        monthlyBaseline: flat(120),
        monthlyTarget: JSON.stringify([127, 134, 140, 147, 154, 160, 167, 174, 180, 187, 194, 200]),
        sortOrder: 2, departmentId: mkt.id,
      },
    }),
  ]);

  // ─── Key Actions (department-level, independent from objectives) ─────

  await Promise.all([
    // Operations
    prisma.keyAction.create({ data: { code: "a1", description: "Renegotiate top-10 vendor contracts", dueDate: new Date("2026-03-31"), owner: "Sarah K.", frequency: "QUARTERLY", sortOrder: 1, departmentId: ops.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Implement automated procurement workflow", dueDate: new Date("2026-04-15"), owner: "Ahmed R.", frequency: "MONTHLY", sortOrder: 2, departmentId: ops.id } }),
    prisma.keyAction.create({ data: { code: "a3", description: "Deploy real-time tracking dashboard", dueDate: new Date("2026-03-20"), owner: "Fatima Z.", frequency: "MONTHLY", sortOrder: 3, departmentId: ops.id } }),
    prisma.keyAction.create({ data: { code: "a4", description: "Optimize warehouse layout per new design", dueDate: new Date("2026-04-30"), owner: "Khalid M.", frequency: "QUARTERLY", sortOrder: 4, departmentId: ops.id } }),
    prisma.keyAction.create({ data: { code: "a5", description: "Hire 3 additional logistics coordinators", dueDate: new Date("2026-03-15"), owner: "Sarah K.", frequency: "MONTHLY", sortOrder: 5, departmentId: ops.id } }),
    // Finance
    prisma.keyAction.create({ data: { code: "a1", description: "Complete ERP data migration for GL module", dueDate: new Date("2026-03-25"), owner: "James M.", frequency: "MONTHLY", sortOrder: 1, departmentId: fin.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Train finance team on new ERP workflows", dueDate: new Date("2026-04-10"), owner: "Mona A.", frequency: "QUARTERLY", sortOrder: 2, departmentId: fin.id } }),
    prisma.keyAction.create({ data: { code: "a3", description: "Automate reconciliation process", dueDate: new Date("2026-03-31"), owner: "James M.", frequency: "MONTHLY", sortOrder: 3, departmentId: fin.id } }),
    // HR
    prisma.keyAction.create({ data: { code: "a1", description: "Launch stay interviews program", dueDate: new Date("2026-03-15"), owner: "Layla A.", frequency: "MONTHLY", sortOrder: 1, departmentId: hr.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Review and adjust compensation bands", dueDate: new Date("2026-04-30"), owner: "Nadia K.", frequency: "QUARTERLY", sortOrder: 2, departmentId: hr.id } }),
    prisma.keyAction.create({ data: { code: "a3", description: "Identify and assess HiPo candidates", dueDate: new Date("2026-03-20"), owner: "Layla A.", frequency: "MONTHLY", sortOrder: 3, departmentId: hr.id } }),
    prisma.keyAction.create({ data: { code: "a4", description: "Design Q2 engagement survey", dueDate: new Date("2026-03-31"), owner: "Reem S.", frequency: "QUARTERLY", sortOrder: 4, departmentId: hr.id } }),
    // Technology
    prisma.keyAction.create({ data: { code: "a1", description: "Migrate 3 core services to cloud", dueDate: new Date("2026-03-31"), owner: "Rami H.", frequency: "MONTHLY", sortOrder: 1, departmentId: tech.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Complete penetration testing", dueDate: new Date("2026-03-20"), owner: "Tariq B.", frequency: "QUARTERLY", sortOrder: 2, departmentId: tech.id } }),
    prisma.keyAction.create({ data: { code: "a3", description: "Deploy SOC monitoring tools", dueDate: new Date("2026-04-15"), owner: "Rami H.", frequency: "MONTHLY", sortOrder: 3, departmentId: tech.id } }),
    // Commercial
    prisma.keyAction.create({ data: { code: "a1", description: "Launch Q1 enterprise outreach campaign", dueDate: new Date("2026-03-15"), owner: "Omar T.", frequency: "MONTHLY", sortOrder: 1, departmentId: sales.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Onboard 3 new sales representatives", dueDate: new Date("2026-03-31"), owner: "Dana F.", frequency: "QUARTERLY", sortOrder: 2, departmentId: sales.id } }),
    // Marketing
    prisma.keyAction.create({ data: { code: "a1", description: "Launch brand refresh campaign", dueDate: new Date("2026-03-20"), owner: "Nora S.", frequency: "MONTHLY", sortOrder: 1, departmentId: mkt.id } }),
    prisma.keyAction.create({ data: { code: "a2", description: "Implement marketing automation platform", dueDate: new Date("2026-04-15"), owner: "Yara M.", frequency: "QUARTERLY", sortOrder: 2, departmentId: mkt.id } }),
  ]);

  // ─── Users ─────────────────────────────────────────────

  const hash = await bcrypt.hash("sms2026", 12);
  const [, , sarah, james, layla, rami, omar, nora] = await Promise.all([
    prisma.user.create({ data: { email: "admin@sms.local", name: "Strategy Office", passwordHash: hash, role: "STRATEGY_MANAGER" } }),
    prisma.user.create({ data: { email: "exec@sms.local", name: "Board Member", passwordHash: hash, role: "EXECUTIVE" } }),
    prisma.user.create({ data: { email: "sarah@sms.local", name: "Sarah K.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: ops.id } }),
    prisma.user.create({ data: { email: "james@sms.local", name: "James M.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: fin.id } }),
    prisma.user.create({ data: { email: "layla@sms.local", name: "Layla A.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: hr.id } }),
    prisma.user.create({ data: { email: "rami@sms.local", name: "Rami H.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: tech.id } }),
    prisma.user.create({ data: { email: "omar@sms.local", name: "Omar T.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: sales.id } }),
    prisma.user.create({ data: { email: "nora@sms.local", name: "Nora S.", passwordHash: hash, role: "FUNCTION_HEAD", departmentId: mkt.id } }),
  ]);

  // ─── Department Assignments (with permissions) ──────────
  await Promise.all([
    // Each function head gets EDIT on their own department
    prisma.userDepartment.create({ data: { userId: sarah.id, departmentId: ops.id, permission: "EDIT" } }),
    prisma.userDepartment.create({ data: { userId: james.id, departmentId: fin.id, permission: "EDIT" } }),
    prisma.userDepartment.create({ data: { userId: layla.id, departmentId: hr.id, permission: "EDIT" } }),
    prisma.userDepartment.create({ data: { userId: rami.id, departmentId: tech.id, permission: "EDIT" } }),
    prisma.userDepartment.create({ data: { userId: omar.id, departmentId: sales.id, permission: "EDIT" } }),
    prisma.userDepartment.create({ data: { userId: nora.id, departmentId: mkt.id, permission: "EDIT" } }),
    // Cross-department VIEW access examples
    prisma.userDepartment.create({ data: { userId: sarah.id, departmentId: fin.id, permission: "VIEW_ONLY" } }),
    prisma.userDepartment.create({ data: { userId: james.id, departmentId: ops.id, permission: "VIEW_ONLY" } }),
  ]);

  // ─── Sample Submissions (4 departments) ──────────────────

  const opsActions = await prisma.keyAction.findMany({ where: { departmentId: ops.id }, orderBy: { sortOrder: "asc" } });
  const finActions = await prisma.keyAction.findMany({ where: { departmentId: fin.id }, orderBy: { sortOrder: "asc" } });
  const hrActions = await prisma.keyAction.findMany({ where: { departmentId: hr.id }, orderBy: { sortOrder: "asc" } });
  const techActions = await prisma.keyAction.findMany({ where: { departmentId: tech.id }, orderBy: { sortOrder: "asc" } });

  const submitted = [
    { div: ops, objs: opsObj, acts: opsActions, values: ["8.9", "96", "2.8"], statuses: ["ON_TRACK", "ON_TRACK", "COMPLETE", "AT_RISK", "COMPLETE"] },
    { div: fin, objs: finObj, acts: finActions, values: ["45", "7"], statuses: ["AT_RISK", "ON_TRACK", "ON_TRACK"] },
    { div: hr, objs: hrObj, acts: hrActions, values: ["11.2", "60", "40"], statuses: ["BLOCKED", "ON_TRACK", "ON_TRACK", "NOT_STARTED"] },
    { div: tech, objs: techObj, acts: techActions, values: ["72", "0"], statuses: ["ON_TRACK", "COMPLETE", "ON_TRACK"] },
  ];

  for (const { div, objs, acts, values, statuses } of submitted) {
    const sub = await prisma.submission.create({
      data: { status: "SUBMITTED", submittedAt: new Date("2026-03-05T14:30:00Z"), departmentId: div.id, periodId: period.id },
    });
    for (let i = 0; i < objs.length; i++) {
      await prisma.objectiveEntry.create({
        data: { achievedValue: values[i] || "0", note: "Monthly progress update submitted.", submissionId: sub.id, objectiveId: objs[i].id },
      });
    }
    for (let i = 0; i < acts.length; i++) {
      await prisma.keyActionEntry.create({
        data: { status: statuses[i] || "NOT_STARTED", progress: "Progress tracked for this period.", nextPriority: "Continue with next milestones.", blockers: "", submissionId: sub.id, keyActionId: acts[i].id },
      });
    }
  }

  console.log("Seeding complete!");
  console.log("  - 1 period (March 2026)");
  console.log("  - 6 departments with objectives (12-month plans, tracking periods) and independent actions");
  console.log("  - 8 users (password: sms2026) with department assignments (EDIT/VIEW_ONLY)");
  console.log("  - 4 sample submissions");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
