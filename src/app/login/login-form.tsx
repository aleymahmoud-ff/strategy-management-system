"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/login/actions";

export default function LoginForm({ tenantSlug }: { tenantSlug?: string }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await loginAction(login, password, tenantSlug);
      if (result?.success) {
        window.location.href = result.redirectTo || "/";
        return;
      }
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative flex flex-1 items-center justify-center p-8">
      {/* Background gradient mesh */}
      <div className="gradient-mesh pointer-events-none absolute inset-0" />

      {/* Decorative grid lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,162,77,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,77,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="animate-scale-in relative w-full max-w-[400px]">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-bg-card p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg-mid">
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12.5 4.5V9.5L7 13L1.5 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.5" className="text-brown" />
                <circle cx="7" cy="7" r="2" fill="currentColor" className="text-peach" />
              </svg>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-wide text-text-hd">
              Strategy <span className="text-brown">Management System</span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">
                Email or Username
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                placeholder="you@sms.local or username"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 pr-10 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-mut transition-colors hover:text-text-bd"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-brown"
              />
              <span className="text-[12px] text-text-sub">Remember me</span>
            </label>

            {error && (
              <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="relative overflow-hidden rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page transition-all duration-200 hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Subtle glow beneath card */}
        <div className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-brown/5 blur-2xl" />
      </div>
    </div>
  );
}
