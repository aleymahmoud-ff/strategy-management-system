import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // If the URL slug doesn't match the user's org, redirect to the correct one
  if (session.user.organizationSlug && tenant !== session.user.organizationSlug) {
    redirect(`/${session.user.organizationSlug}/`);
  }

  return <>{children}</>;
}
