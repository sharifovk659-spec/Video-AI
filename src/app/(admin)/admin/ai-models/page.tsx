import { AdminListPage } from "@/components/admin/admin-list-page";

export default function AdminAiModelsPage() {
  return <AdminListPage title="AI Models" endpoint="/api/admin/ai-models" />;
}
