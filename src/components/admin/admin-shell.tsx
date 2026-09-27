"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/templates", label: "Стили" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/generations", label: "Генерации" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/payments", label: "Платежи" },
  { href: "/admin/packages", label: "Пакеты" },
  { href: "/admin/ai-models", label: "AI модели" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#050508] text-zinc-50 lg:flex">
      <aside className="border-b border-white/10 bg-[#0c0a12] px-4 py-4 lg:w-64 lg:border-b-0 lg:border-r">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
          Vidoo Admin
        </p>
        <Link
          href="/mini-app"
          className="mt-2 inline-block text-xs text-zinc-500 hover:text-violet-300"
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
                    : "text-zinc-400 hover:bg-white/5"
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
