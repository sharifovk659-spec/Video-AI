import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ConfirmGenerationScreen } from "@/components/mini-app/confirm-generation-screen";
import { SkeletonBlock } from "@/components/mini-app/states";

type Props = { params: Promise<{ slug: string }> };

async function ConfirmInner({ slug }: { slug: string }) {
  const template = await prisma.template.findFirst({
    where: { slug, status: "active" },
    select: { slug: true, title: true, creditCost: true },
  });
  if (!template) notFound();

  return (
    <ConfirmGenerationScreen
      templateSlug={template.slug}
      templateTitle={template.title}
      creditCost={template.creditCost}
    />
  );
}

export default async function ConfirmPage({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <SkeletonBlock className="h-40 w-full" />
        </div>
      }
    >
      <ConfirmInner slug={slug} />
    </Suspense>
  );
}
