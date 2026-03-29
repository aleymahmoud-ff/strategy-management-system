import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "FUNCTION_HEAD") {
    redirect(`/${tenant}/functional-plans`);
  }

  redirect(`/${tenant}/dashboard`);
}
