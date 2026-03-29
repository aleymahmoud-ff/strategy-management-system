import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/health", "/api/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.auth;

  // Not authenticated -> redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.user?.role;

  // /super-admin/* — only SUPER_ADMIN can access
  if (pathname.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Root path -> super admin panel
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/super-admin/tenants", req.url));
  }

  // /{tenant}/... routes — tenant is determined by URL, not user
  const segments = pathname.split("/").filter(Boolean);
  const restPath = "/" + segments.slice(1).join("/");

  // Role-based access control within the tenant
  const urlTenant = segments[0];

  if (restPath.startsWith("/dashboard") && role === "FUNCTION_HEAD") {
    return NextResponse.redirect(new URL(`/${urlTenant}/functional-plans`, req.url));
  }

  if (restPath.startsWith("/functional-plans") && role === "EXECUTIVE") {
    return NextResponse.redirect(new URL(`/${urlTenant}/dashboard`, req.url));
  }

  if (restPath.startsWith("/admin") && role !== "STRATEGY_MANAGER" && role !== "SUPER_ADMIN") {
    const defaultPath = role === "FUNCTION_HEAD" ? "/functional-plans" : "/dashboard";
    return NextResponse.redirect(new URL(`/${urlTenant}${defaultPath}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|api/auth|api/health|api/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
