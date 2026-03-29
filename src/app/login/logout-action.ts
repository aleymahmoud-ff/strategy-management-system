"use server";

import { auth, signOut } from "@/lib/auth";

export async function logoutAction() {
  const session = await auth();
  const slug = session?.user?.organizationSlug;
  const redirectTo = slug ? `/${slug}/login` : "/login";
  await signOut({ redirectTo });
}
