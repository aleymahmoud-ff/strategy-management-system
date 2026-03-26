"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email/username or password" };
    }
    // next-auth v5 throws NEXT_REDIRECT on success — re-throw so Next.js handles it
    throw error;
  }
}
