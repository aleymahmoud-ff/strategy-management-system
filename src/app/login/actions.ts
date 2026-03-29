"use server";

import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(email: string, password: string, tenantSlug?: string) {
  try {
    await signIn("credentials", {
      email,
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

  const session = await auth();
  if (!session) {
    return { error: "Login failed", success: false, redirectTo: null };
  }

  const { role, organizationSlug } = session.user;

  // Super admin login (no tenant slug)
  if (!tenantSlug) {
    if (role !== "SUPER_ADMIN") {
      return { error: "This login is for super admins only", success: false, redirectTo: null };
    }
    return { success: true, error: null, redirectTo: "/super-admin/tenants" };
  }

  // Tenant login — verify user belongs to this tenant
  if (role === "SUPER_ADMIN") {
    return { error: "Super admins should login at /login", success: false, redirectTo: null };
  }

  if (organizationSlug && organizationSlug !== tenantSlug) {
    return { error: "Your account does not belong to this organization", success: false, redirectTo: null };
  }

  const defaultPage = role === "FUNCTION_HEAD" ? "/functional-plans" : "/dashboard";
  return { success: true, error: null, redirectTo: `/${tenantSlug}${defaultPage}` };
}
