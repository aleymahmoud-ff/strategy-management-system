"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(email: string, password: string, tenantSlug?: string) {
  // First, look up the user to check role and org BEFORE signing in
  const login = email.trim();
  const isEmail = login.includes("@");

  const user = await prisma.user.findFirst({
    where: isEmail ? { email: login } : { username: login },
    include: {
      organization: { select: { slug: true } },
    },
  });

  if (!user) {
    return { error: "Invalid email/username or password", success: false, redirectTo: null };
  }

  const userRole = user.role;
  const userOrgSlug = user.organization?.slug || "";

  // Validate access before attempting signIn
  if (!tenantSlug) {
    // Super admin login at /login
    if (userRole !== "SUPER_ADMIN") {
      return { error: "This login is for super admins only", success: false, redirectTo: null };
    }
  } else {
    // Tenant login at /{tenant}/login
    if (userRole === "SUPER_ADMIN") {
      return { error: "Super admins should login at /login", success: false, redirectTo: null };
    }
    if (userOrgSlug && userOrgSlug !== tenantSlug) {
      return { error: "Your account does not belong to this organization", success: false, redirectTo: null };
    }
  }

  // Now attempt signIn
  try {
    await signIn("credentials", {
      email: login,
      password,
      redirect: false,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      // signIn succeeded — fall through
    } else if (error instanceof AuthError) {
      return { error: "Invalid email/username or password", success: false, redirectTo: null };
    } else {
      return { error: "Something went wrong. Please try again.", success: false, redirectTo: null };
    }
  }

  // Determine redirect
  if (userRole === "SUPER_ADMIN") {
    return { success: true, error: null, redirectTo: "/super-admin/tenants" };
  }

  const defaultPage = userRole === "FUNCTION_HEAD" ? "/functional-plans" : "/dashboard";
  return { success: true, error: null, redirectTo: `/${userOrgSlug}${defaultPage}` };
}
