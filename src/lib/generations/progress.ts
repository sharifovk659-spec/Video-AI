/** Shown to Mini App users. Provider JSON stays in logs/DB only. */
export const USER_GENERATION_ERROR =
  "Не удалось создать видео. Попробуйте ещё раз.";

/**
 * Real stage → percent. Starts at 1 and steps by 1%.
 * Kling does not return a percent; while status stays "processing"
 * the bar advances slowly and stops at 96 until the provider completes.
 */
export function generationProgressPercent(input: {
  status: string;
  stage: string | null;
  createdAt: Date;
  now?: number;
}): number {
  const status = input.status.toLowerCase();
  if (status === "completed") return 100;
  if (status === "failed" || status === "cancelled") return 100;

  const elapsed = Math.max(
    0,
    (input.now ?? Date.now()) - input.createdAt.getTime(),
  );
  const stage = (input.stage ?? status).toLowerCase();

  if (stage === "queued" || stage === "pending") {
    return Math.min(8, 1 + Math.floor(elapsed / 4000));
  }
  if (stage === "submitting" || stage === "retrying") {
    return Math.min(16, 8 + Math.floor(elapsed / 3000));
  }
  if (
    stage === "processing" ||
    stage === "rendering" ||
    stage === "running"
  ) {
    return Math.min(96, 16 + Math.floor(elapsed / 2500));
  }
  return 1;
}
