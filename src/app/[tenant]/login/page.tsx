import { headers } from "next/headers";
import LoginForm from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default async function TenantLoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  await headers();
  const { tenant } = await params;
  return <LoginForm tenantSlug={tenant} />;
}
