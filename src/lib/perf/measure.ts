/**
 * Lightweight before/after timing helper for production tuning.
 * Used by analytics meta.queryMs and ad-hoc scripts — no heavy APM.
 */
export function measureSync<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = fn();
  return { result, ms: Math.round(performance.now() - start) };
}

export async function measureAsync<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - start) };
}
