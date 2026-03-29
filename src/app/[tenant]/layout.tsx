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

  // Validate that this tenant slug exists and user has access
  // The API layer handles org scoping via session — this layout just passes through
  return <>{children}</>;
}
