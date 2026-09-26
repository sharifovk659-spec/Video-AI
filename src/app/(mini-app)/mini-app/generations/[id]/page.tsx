import { GenerationStatusScreen } from "@/components/mini-app/generation-status-screen";

type Props = { params: Promise<{ id: string }> };

export default async function GenerationPage({ params }: Props) {
  const { id } = await params;
  return <GenerationStatusScreen id={id} />;
}
