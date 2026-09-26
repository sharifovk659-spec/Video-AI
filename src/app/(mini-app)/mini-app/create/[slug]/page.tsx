import { prisma } from "@/lib/db/prisma";
import { PhotoUploadFlow } from "@/components/mini-app/photo-upload-flow";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function CreateWithPhotoPage({ params }: Props) {
  const { slug } = await params;
  const template = await prisma.template.findFirst({
    where: { slug, status: "active" },
    select: { slug: true, title: true },
  });
  if (!template) notFound();

  return (
    <PhotoUploadFlow templateSlug={template.slug} templateTitle={template.title} />
  );
}
