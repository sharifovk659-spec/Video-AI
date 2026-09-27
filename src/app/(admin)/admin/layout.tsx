import type { Metadata } from "next";
import { AdminAuthorizedLayout } from "@/components/admin/admin-authorized-layout";

export const metadata: Metadata = {
  title: "Admin | Vidoo AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminAuthorizedLayout>{children}</AdminAuthorizedLayout>;
}
