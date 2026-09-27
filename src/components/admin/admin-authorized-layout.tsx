import type { ReactNode } from "react";
import Link from "next/link";
import { getAdminPageAccess } from "@/lib/admin/require-admin-page";
import { AdminShell } from "@/components/admin/admin-shell";

function AdminDenied({ reason }: { reason: "unauthenticated" | "forbidden" }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {reason === "unauthenticated"
          ? "Sign in required"
          : "Admin access required"}
      </p>
      <p className="max-w-md text-sm text-zinc-500">
        {reason === "unauthenticated"
          ? "Open Vidoo AI from Telegram first, then use Admin Panel."
          : "Your Telegram account is not listed in ADMIN_TELEGRAM_IDS."}
      </p>
      <Link
        href="/mini-app"
        className="mt-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
      >
        Back to Mini App
      </Link>
    </div>
  );
}

/**
 * Server-authorized admin layout. Client-only hiding is insufficient —
 * non-admins never receive the admin shell from the server.
 */
export async function AdminAuthorizedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminDenied reason={access.reason} />;
  }
  return <AdminShell>{children}</AdminShell>;
}
