/**
 * Image-to-video files start on the uploaded photo.
 * A later timestamp is the still shown before play, so the result
 * page does not use that photo as a cover.
 */
export function generatedVideoPosterTime(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0.5) return 0;
  const target = Math.min(1.5, Math.max(0.6, durationSeconds * 0.2));
  if (target >= durationSeconds) return durationSeconds * 0.5;
  return target;
}
