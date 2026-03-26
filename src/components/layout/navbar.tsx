"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { logoutAction } from "@/app/login/logout-action";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", roles: ["STRATEGY_MANAGER", "EXECUTIVE"] },
  { href: "/functional-plans", label: "Functional Plans", roles: ["FUNCTION_HEAD", "STRATEGY_MANAGER"] },
  { href: "/admin/plans", label: "Plan Builder", roles: ["STRATEGY_MANAGER"] },
  { href: "/admin/periods", label: "Periods", roles: ["STRATEGY_MANAGER"] },
  { href: "/admin/users", label: "Users", roles: ["STRATEGY_MANAGER"] },
];

const ROLE_LABELS: Record<string, string> = {
  STRATEGY_MANAGER: "Strategy Manager",
  FUNCTION_HEAD: "Function Head",
  EXECUTIVE: "Executive",
};

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  if (!session || pathname === "/login") return null;

  const { name, email, role, image } = session.user;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] max-w-[1440px] items-center justify-between px-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-brown/20" />
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="relative">
              <path d="M7 1L12.5 4.5V9.5L7 13L1.5 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.5" className="text-brown" />
              <circle cx="7" cy="7" r="2" fill="currentColor" className="text-peach" />
            </svg>
          </div>
          <span className="font-heading text-lg font-semibold tracking-wide text-text-hd">
            Strategy <span className="text-brown">Management System</span>
          </span>
        </div>

        {/* Nav Tabs */}
        <div className="flex items-center gap-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "text-brown"
                    : "text-text-sub hover:text-text-bd"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-brown" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-border bg-bg-mid px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-sub">
            MAR 2026
          </span>
          <div className="h-4 w-px bg-border" />

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-mid text-[11px] font-bold text-brown transition-all duration-200 hover:border-brown/30 hover:shadow-[0_0_12px_rgba(201,162,77,0.15)]"
              title="User menu"
            >
              {image ? (
                <Image
                  src={image}
                  alt={name}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border bg-bg-card shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {/* User info header */}
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-mid">
                      {image ? (
                        <Image
                          src={image}
                          alt={name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[13px] font-bold text-brown">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-hd">{name}</p>
                      <p className="truncate text-[11px] text-text-sub">{email}</p>
                    </div>
                  </div>
                  <span className="mt-2 inline-block rounded-md border border-border bg-bg-mid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px] text-text-sub">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-bd transition-colors hover:bg-bg-mid"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-sub">
                      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Profile Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-border py-1.5">
                  <button
                    onClick={() => logoutAction()}
                    className="flex w-full items-center gap-3 px-4 py-2 text-[13px] text-red transition-colors hover:bg-bg-mid"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Bottom glow line */}
      <div className="divider-glow" />
    </nav>
  );
}
