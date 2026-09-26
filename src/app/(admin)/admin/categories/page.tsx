import { AdminListPage } from "@/components/admin/admin-list-page";

export default function AdminCategoriesPage() {
  return <AdminListPage title="Categories" endpoint="/api/admin/categories" />;
}
