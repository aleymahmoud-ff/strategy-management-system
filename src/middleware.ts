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
  const slug = (token.user as { organizationSlug?: string })?.organizationSlug;

  // Root path -> redirect to tenant root
  if (pathname === "/") {
    if (slug) {
      return NextResponse.redirect(new URL(`/${slug}/`, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Extract tenant segment from URL: /{tenant}/...
  const segments = pathname.split("/").filter(Boolean);
  const urlTenant = segments[0];
  const restPath = "/" + segments.slice(1).join("/");

  // If the URL tenant doesn't match the user's org slug, redirect to correct org
  if (slug && urlTenant !== slug) {
    return NextResponse.redirect(new URL(`/${slug}${restPath || "/"}`, req.url));
  }

  // Role-based access control (using the path after the tenant segment)
  if (restPath.startsWith("/dashboard") && role === "FUNCTION_HEAD") {
    return NextResponse.redirect(new URL(`/${urlTenant}/functional-plans`, req.url));
  }

  if (restPath.startsWith("/functional-plans") && role === "EXECUTIVE") {
    return NextResponse.redirect(new URL(`/${urlTenant}/dashboard`, req.url));
  }

  if (restPath.startsWith("/admin") && role !== "STRATEGY_MANAGER") {
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
