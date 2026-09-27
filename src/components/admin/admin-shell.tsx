"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/generations", label: "Generations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/ai-models", label: "AI Models" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900 lg:flex dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="border-b border-zinc-200 bg-white px-4 py-4 lg:w-64 lg:border-b-0 lg:border-r dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
          Vidoo Admin
        </p>
        <Link
          href="/mini-app"
          className="mt-2 inline-block text-xs text-zinc-500 hover:text-violet-600"
        >
          ← Mini App
        </Link>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-violet-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
