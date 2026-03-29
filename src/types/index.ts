import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string | null;
      role: "SUPER_ADMIN" | "FUNCTION_HEAD" | "STRATEGY_MANAGER" | "EXECUTIVE";
      departmentId: string | null;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      assignments: { departmentId: string; permission: "EDIT" | "VIEW_ONLY" }[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: string;
    departmentId: string | null;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    assignments: { departmentId: string; permission: string }[];
  }
}

export type Role = "SUPER_ADMIN" | "FUNCTION_HEAD" | "STRATEGY_MANAGER" | "EXECUTIVE";

export type ActionStatus =
  | "COMPLETE"
  | "ON_TRACK"
  | "AT_RISK"
  | "NOT_STARTED"
  | "BLOCKED"
  | "DEFERRED";

export type SubmissionStatus = "DRAFT" | "SUBMITTED";
