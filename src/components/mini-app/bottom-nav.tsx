"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  center?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/mini-app", label: "Home", icon: "⌂" },
  { href: "/mini-app/templates", label: "Templates", icon: "▦" },
  { href: "/mini-app/create", label: "Create", icon: "＋", center: true },
  { href: "/mini-app/videos", label: "My Videos", icon: "▶" },
  { href: "/mini-app/profile", label: "Profile", icon: "☺" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-500/20 bg-[#0a0612]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-end justify-between px-2 py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/mini-app"
              ? pathname === "/mini-app"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] transition-colors ${
                  item.center
                    ? "-mt-5 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3 py-2 text-white vidoo-glow"
                    : active
                      ? "text-violet-300"
                      : "text-zinc-500"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
