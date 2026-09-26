import { TemplateDetailScreen } from "@/components/mini-app/template-detail-screen";

type Props = { params: Promise<{ slug: string }> };

export default async function TemplateDetailPage({ params }: Props) {
  const { slug } = await params;
  return <TemplateDetailScreen slug={slug} />;
}
