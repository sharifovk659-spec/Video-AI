"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/mini-app", label: "Главная", icon: "⌂" },
  { href: "/mini-app/templates", label: "Стили", icon: "▦" },
  { href: "/mini-app/create", label: "Создать", icon: "＋", center: true },
  { href: "/mini-app/videos", label: "Видео", icon: "▶" },
  { href: "/mini-app/profile", label: "Профиль", icon: "☺" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07060c]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-lg items-end justify-between px-1 pt-1">
        {ITEMS.map((item) => {
          const active =
            item.href === "/mini-app"
              ? pathname === "/mini-app"
              : pathname.startsWith(item.href);
          const center = "center" in item && item.center;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] leading-none transition-colors ${
                  center
                    ? "-mt-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-2 py-2.5 text-white shadow-lg shadow-violet-900/40"
                    : active
                      ? "text-violet-200"
                      : "text-zinc-500"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
