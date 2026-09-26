import { AdminListPage } from "@/components/admin/admin-list-page";

export default function AdminPaymentsPage() {
  return <AdminListPage title="Payments" endpoint="/api/admin/payments" />;
}
