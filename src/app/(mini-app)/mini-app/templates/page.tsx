import { Suspense } from "react";
import { TemplatesScreen } from "@/components/mini-app/templates-screen";
import { SkeletonBlock } from "@/components/mini-app/states";

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <SkeletonBlock className="mb-4 h-8 w-40" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      }
    >
      <TemplatesScreen />
    </Suspense>
  );
}
