"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Invalid email or password" : `Auth error: ${result.error} (${result.status})`);
      return;
    }

    router.push("/");
    router.refresh();
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                placeholder="you@sms.local"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1px] text-text-sub">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red/20 bg-red-bg px-3.5 py-2.5 text-[13px] text-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden rounded-lg bg-brown px-5 py-2.5 text-[13px] font-semibold text-bg-page transition-all duration-200 hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Subtle glow beneath card */}
        <div className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-brown/5 blur-2xl" />
      </div>
    </div>
  );
}
