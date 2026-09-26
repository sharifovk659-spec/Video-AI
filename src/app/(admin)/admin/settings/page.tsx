import { AdminListPage } from "@/components/admin/admin-list-page";

export default function AdminSettingsPage() {
  return <AdminListPage title="Settings" endpoint="/api/admin/settings" />;
}
