import { AdminListPage } from "@/components/admin/admin-list-page";

export default function AdminGenerationsPage() {
  return <AdminListPage title="Generations" endpoint="/api/admin/generations" />;
}
