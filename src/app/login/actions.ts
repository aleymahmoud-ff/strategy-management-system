"use server";

import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      // signIn succeeded but tried to redirect — treat as success, fall through
    } else if (error instanceof AuthError) {
      return { error: "Invalid email/username or password", success: false, redirectTo: null };
    } else {
      return { error: "Something went wrong. Please try again.", success: false, redirectTo: null };
    }
  }

  // Get the session to determine where to redirect
  const session = await auth();
  if (!session) {
    return { error: "Login failed", success: false, redirectTo: null };
  }

  const { role, organizationSlug } = session.user;

  if (role === "SUPER_ADMIN") {
    return { success: true, error: null, redirectTo: "/super-admin/tenants" };
  }

  if (!organizationSlug) {
    return { success: true, error: null, redirectTo: "/" };
  }

  const defaultPage = role === "FUNCTION_HEAD" ? "/functional-plans" : "/dashboard";
  return { success: true, error: null, redirectTo: `/${organizationSlug}${defaultPage}` };
}
