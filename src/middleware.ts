import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/health", "/api/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow API paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.auth;
  const role = token?.user?.role;

  // Extract segments: /{tenant}/login, /{tenant}/dashboard, etc.
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const restPath = "/" + segments.slice(1).join("/");

  // Allow tenant login pages (/{tenant}/login) without auth
  if (segments.length >= 2 && restPath === "/login") {
    return NextResponse.next();
  }

  // Not authenticated
  if (!token) {
    // If on a tenant path, redirect to tenant login
    if (firstSegment && firstSegment !== "login" && firstSegment !== "super-admin") {
      return NextResponse.redirect(new URL(`/${firstSegment}/login`, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

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

  // Non-SUPER_ADMIN trying to access root super admin
  if (firstSegment === "super-admin" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // /{tenant}/... routes — role-based access within tenant
  const urlTenant = firstSegment;

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
