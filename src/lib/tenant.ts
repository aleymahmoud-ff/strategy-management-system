import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

interface TenantSuccess {
  error: null;
  session: Session;
  orgId: string;
  orgWhere: { organizationId: string };
}

interface TenantError {
  error: NextResponse;
  session: null;
  orgId: null;
  orgWhere: null;
}

/**
 * Get the authenticated session with tenant context.
 * Returns orgId and orgWhere for scoping Prisma queries.
 * Optionally enforces a required role.
 */
export async function getTenantSession(
  requiredRole?: "STRATEGY_MANAGER" | "FUNCTION_HEAD" | "EXECUTIVE"
): Promise<TenantSuccess | TenantError> {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      orgId: null,
      orgWhere: null,
    };
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      orgId: null,
      orgWhere: null,
    };
  }

  return {
    error: null,
    session: session as Session,
    orgId: session.user.organizationId,
    orgWhere: { organizationId: session.user.organizationId },
  };
}
