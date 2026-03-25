import { headers } from "next/headers";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Force dynamic rendering by reading headers
  await headers();
  return <LoginForm />;
}
