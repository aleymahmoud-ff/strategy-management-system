"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true, error: null };
  } catch (error) {
    if (isRedirectError(error)) {
      // signIn succeeded but tried to redirect — treat as success
      return { success: true, error: null };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email/username or password", success: false };
    }
    return { error: "Something went wrong. Please try again.", success: false };
  }
}
