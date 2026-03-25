import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/health"];

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

  // Route-based access control
  if (pathname.startsWith("/dashboard") && role === "FUNCTION_HEAD") {
    return NextResponse.redirect(new URL("/functional-plans", req.url));
  }

  if (pathname.startsWith("/functional-plans") && role === "EXECUTIVE") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "STRATEGY_MANAGER") {
    const defaultPath = role === "FUNCTION_HEAD" ? "/functional-plans" : "/dashboard";
    return NextResponse.redirect(new URL(defaultPath, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|api/auth|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
