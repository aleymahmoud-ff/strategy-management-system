"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Role = "STRATEGY_MANAGER" | "FUNCTION_HEAD" | "EXECUTIVE";

const ROLE_LABELS: Record<Role, string> = {
  STRATEGY_MANAGER: "Strategy Manager (Admin)",
  FUNCTION_HEAD: "Department Head",
  EXECUTIVE: "Executive",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  STRATEGY_MANAGER:
    "Full system access. Manages departments, objectives, periods, users, and monitors all submissions.",
  FUNCTION_HEAD:
    "Submits functional plans for assigned departments. Reports on objectives and key actions each period.",
  EXECUTIVE:
    "Read-only access to the consolidated strategy dashboard. Monitors progress and identifies deviations.",
};

type Step = { title: string; description: string; link?: string };
type Section = { title: string; icon: string; steps: Step[] };

const WORKFLOWS: Record<Role, Section[]> = {
  STRATEGY_MANAGER: [
    {
      title: "1. Set Up Departments",
      icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
      steps: [
        {
          title: "Open Plan Builder",
          description: 'Navigate to the Plan Builder page and click "+ Add Department".',
          link: "/admin/plans",
        },
        {
          title: "Enter department details",
          description:
            "Provide the department name, head name, and initials (auto-generated from name). Click Create Department.",
        },
        {
          title: "Repeat for all departments",
          description:
            "Create all departments in your organization (e.g., Retail, External Sales, HR, Finance).",
        },
      ],
    },
    {
      title: "2. Define Objectives & Key Actions",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      steps: [
        {
          title: "Select a department",
          description: "In Plan Builder, click on a department card to open its plan.",
          link: "/admin/plans",
        },
        {
          title: "Add strategic objectives",
          description:
            'Click "+ Objective" and fill in: statement, unit of measure (%, SAR, count, etc.), target direction, tracking period, and monthly baseline/target values.',
        },
        {
          title: "Add key actions",
          description:
            'Click "+ Key Action" and define: description, due date, owner name, and frequency (Monthly or Quarterly).',
        },
        {
          title: "Repeat for each department",
          description:
            "Go back to Plan Builder and configure objectives and key actions for every department.",
        },
      ],
    },
    {
      title: "3. Create Reporting Periods",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      steps: [
        {
          title: "Open Periods page",
          description: "Navigate to the Periods management page.",
          link: "/admin/periods",
        },
        {
          title: "Create a new period",
          description:
            "Select the month and year, set a submission deadline, and click Create.",
        },
        {
          title: "Set the period as active",
          description:
            'Click the "Set Active" button on the period. Only one period can be active at a time. This is the period department heads will report on.',
        },
      ],
    },
    {
      title: "4. Manage Users",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
      steps: [
        {
          title: "Open Users page",
          description: "Navigate to the Users management page.",
          link: "/admin/users",
        },
        {
          title: "Create user accounts",
          description:
            "Click Add User. Provide name, email, username, password, and select their role (Strategy Manager, Function Head, or Executive).",
        },
        {
          title: "Assign departments",
          description:
            'For Function Head users, click "Manage" on their card to assign them to one or more departments with EDIT or VIEW_ONLY permission.',
        },
      ],
    },
    {
      title: "5. Monitor & Review",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      steps: [
        {
          title: "View the Dashboard",
          description:
            "The Dashboard shows consolidated KPIs: submission count, objectives on-track, average progress, and deviations across all departments.",
          link: "/dashboard",
        },
        {
          title: "Track submissions",
          description:
            "The Submission Status panel shows which departments have submitted their reports for the active period.",
        },
        {
          title: "Review deviations",
          description:
            "The Deviations panel highlights objectives that are underperforming against their targets.",
        },
        {
          title: "Edit any department's plan",
          description:
            "As an admin, you can access any department's functional plan via the Functional Plans page to review or edit submitted data.",
          link: "/functional-plans",
        },
      ],
    },
  ],
  FUNCTION_HEAD: [
    {
      title: "1. Access Your Department",
      icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
      steps: [
        {
          title: "Go to Functional Plans",
          description:
            "After logging in, you will be redirected to the Functional Plans page. If you have one department assigned, you go directly to your plan.",
          link: "/functional-plans",
        },
        {
          title: "Select your department",
          description:
            "If you are assigned to multiple departments, select the one you want to report on. Departments show your permission level (Edit or View Only).",
        },
      ],
    },
    {
      title: "2. Fill In Objective Results",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      steps: [
        {
          title: "Review your objectives",
          description:
            "Each objective shows the target value and unit of measure for the current period. The baseline and target are set by the Strategy Manager.",
        },
        {
          title: "Enter achieved values",
          description:
            "For each objective, enter the actual achieved value in the input field. You can also add notes to explain variances or provide context.",
        },
        {
          title: "Auto-save",
          description:
            "Your entries are automatically saved as a draft as you type. You will see a save indicator confirming your data is stored.",
        },
      ],
    },
    {
      title: "3. Update Key Actions",
      icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
      steps: [
        {
          title: "Set action status",
          description:
            "For each key action, update the status: Not Started, In Progress, or Complete.",
        },
        {
          title: "Log progress details",
          description:
            "Describe what has been accomplished for each action in the progress field.",
        },
        {
          title: "Add next priorities and blockers",
          description:
            "Document what the next steps are and any blockers preventing progress.",
        },
      ],
    },
    {
      title: "4. Submit Your Report",
      icon: "M5 13l4 4L19 7",
      steps: [
        {
          title: "Review your entries",
          description:
            "Before submitting, review all objective values and key action updates to ensure accuracy.",
        },
        {
          title: 'Click "Submit Report"',
          description:
            "Click the Submit button at the bottom of the page. A confirmation dialog will appear.",
        },
        {
          title: "Confirm submission",
          description:
            "After confirming, your report is locked and marked as submitted. You will see a success confirmation screen.",
        },
        {
          title: "Important: Submit before the deadline",
          description:
            "Reports cannot be edited after the submission deadline or after you submit. Make sure all data is accurate before submitting.",
        },
      ],
    },
  ],
  EXECUTIVE: [
    {
      title: "1. View the Strategy Dashboard",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      steps: [
        {
          title: "Open the Dashboard",
          description:
            "After logging in, you are automatically directed to the Dashboard. This is your primary view of strategic performance.",
          link: "/dashboard",
        },
        {
          title: "Review KPI cards",
          description:
            "At the top, summary cards show: number of submissions received, total departments, objectives on-track, average progress score, and deviations count.",
        },
      ],
    },
    {
      title: "2. Analyze Objectives",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      steps: [
        {
          title: "Browse the objectives table",
          description:
            "The sortable table lists all objectives across every department, showing achieved values, targets, progress percentage, and status.",
        },
        {
          title: "Identify high performers and laggards",
          description:
            "Sort by progress or status to quickly identify which objectives are on-track and which need attention.",
        },
      ],
    },
    {
      title: "3. Monitor Submissions & Deviations",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      steps: [
        {
          title: "Check submission status",
          description:
            "The Submission Status panel shows which departments have submitted their reports and which are still pending.",
        },
        {
          title: "Review deviations",
          description:
            "The Deviations panel highlights objectives where actual performance is significantly below the target. Use this to identify areas requiring intervention.",
        },
        {
          title: "Manage your profile",
          description: "Update your name, email, photo, or password from the Profile page.",
          link: "/profile",
        },
      ],
    },
  ],
};

const PAGES_BY_ROLE: Record<Role, { name: string; path: string; description: string }[]> = {
  STRATEGY_MANAGER: [
    { name: "Dashboard", path: "/dashboard", description: "Consolidated KPIs and progress across all departments" },
    { name: "Functional Plans", path: "/functional-plans", description: "View and edit any department's functional plan" },
    { name: "Plan Builder", path: "/admin/plans", description: "Create and manage departments, objectives, and key actions" },
    { name: "Periods", path: "/admin/periods", description: "Create reporting periods and set submission deadlines" },
    { name: "Users", path: "/admin/users", description: "Manage user accounts and department assignments" },
    { name: "Profile", path: "/profile", description: "Update your personal information and password" },
  ],
  FUNCTION_HEAD: [
    { name: "Functional Plans", path: "/functional-plans", description: "Submit reports for your assigned departments" },
    { name: "Profile", path: "/profile", description: "Update your personal information and password" },
  ],
  EXECUTIVE: [
    { name: "Dashboard", path: "/dashboard", description: "View consolidated strategy performance and KPIs" },
    { name: "Profile", path: "/profile", description: "Update your personal information and password" },
  ],
};

export default function GuidePage() {
  const { data: session } = useSession();
  const slug = session?.user?.organizationSlug || "";
  const orgPath = (p: string) => `/${slug}${p}`;
  const userRole = session?.user?.role as Role | undefined;
  const [activeRole, setActiveRole] = useState<Role>(userRole || "STRATEGY_MANAGER");

  const roles: Role[] = ["STRATEGY_MANAGER", "FUNCTION_HEAD", "EXECUTIVE"];

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="animate-fade-in-up font-heading text-[30px] font-bold text-text-hd">
          User Guide
        </h1>
        <p className="mt-1 text-[13px] text-text-sub">
          Step-by-step workflows and feature reference for each role
        </p>
      </div>

      {/* Role Tabs */}
      <div className="mb-8 flex gap-1 rounded-lg border border-border bg-bg-card p-1">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`flex-1 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all ${
              activeRole === role
                ? "bg-brown text-bg-page shadow-sm"
                : "text-text-sub hover:text-text-bd"
            }`}
          >
            {ROLE_LABELS[role]}
            {userRole === role && (
              <span className="ml-2 rounded-full bg-bg-page/20 px-2 py-0.5 text-[10px]">
                You
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Role Description */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brown/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brown">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-text-hd">
              {ROLE_LABELS[activeRole]}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-text-sub">
              {ROLE_DESCRIPTIONS[activeRole]}
            </p>
          </div>
        </div>
      </div>

      {/* Accessible Pages */}
      <div className="mb-8">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">
          Accessible Pages
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {PAGES_BY_ROLE[activeRole].map((page) => (
            <Link
              key={page.path}
              href={orgPath(page.path)}
              className="group rounded-lg border border-border bg-bg-card p-4 transition-all hover:border-brown/30 hover:shadow-[0_0_16px_rgba(201,162,77,0.08)]"
            >
              <div className="text-[14px] font-semibold text-text-hd group-hover:text-brown">
                {page.name}
              </div>
              <div className="mt-1 text-[12px] text-text-sub">{page.description}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Workflow Sections */}
      <div className="mb-4">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">
          Step-by-Step Workflow
        </h3>
      </div>

      <div className="flex flex-col gap-6">
        {WORKFLOWS[activeRole].map((section, sIdx) => (
          <div
            key={sIdx}
            className="rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]"
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-deep">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brown">
                  <path d={section.icon} />
                </svg>
              </div>
              <h3 className="font-heading text-[16px] font-bold text-text-hd">
                {section.title}
              </h3>
            </div>

            {/* Steps */}
            <div className="px-6 py-2">
              {section.steps.map((step, stepIdx) => (
                <div
                  key={stepIdx}
                  className="flex gap-4 border-b border-border/50 py-4 last:border-0"
                >
                  {/* Step Number */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-deep text-[12px] font-bold text-brown">
                    {stepIdx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-text-hd">
                        {step.title}
                      </span>
                      {step.link && (
                        <Link
                          href={orgPath(step.link)}
                          className="rounded-md bg-bg-deep px-2 py-0.5 text-[10px] font-semibold text-brown hover:bg-brown/10"
                        >
                          Go to page
                        </Link>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-sub">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-xl border border-brown/20 bg-brown/5 p-6">
        <h3 className="mb-3 font-heading text-[15px] font-bold text-brown">
          {activeRole === "STRATEGY_MANAGER" && "Admin Tips"}
          {activeRole === "FUNCTION_HEAD" && "Submission Tips"}
          {activeRole === "EXECUTIVE" && "Dashboard Tips"}
        </h3>
        <ul className="flex flex-col gap-2">
          {activeRole === "STRATEGY_MANAGER" && (
            <>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Only one period can be active at a time. Activate the current month before department heads need to submit.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Departments cannot be deleted if they have any submissions. Remove submissions first if needed.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                You can edit any department's functional plan at any time, even after submission or deadline.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Assign Function Heads to departments with EDIT permission for submission access, or VIEW_ONLY for read-only access.
              </li>
            </>
          )}
          {activeRole === "FUNCTION_HEAD" && (
            <>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Your data is auto-saved as you type. No need to click a save button for drafts.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Once you submit, your report is locked. Double-check all values before clicking Submit.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                You cannot edit after the submission deadline passes, even if you haven't submitted yet.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                If you have VIEW_ONLY access to a department, you can see its data but cannot edit or submit.
              </li>
            </>
          )}
          {activeRole === "EXECUTIVE" && (
            <>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                The dashboard shows data only for the active period. Contact your Strategy Manager to change the active period.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Deviations highlight objectives where actual performance is below target. Use this for focused review discussions.
              </li>
              <li className="flex items-start gap-2 text-[13px] text-text-bd">
                <span className="mt-0.5 text-brown">*</span>
                Check the Submissions panel to see if all departments have reported before drawing conclusions from the dashboard.
              </li>
            </>
          )}
        </ul>
      </div>
    </main>
  );
}
