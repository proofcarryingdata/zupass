/**
 * This function returns an id that is a function of time. It is stable
 * for each contiguous duration of {@link intervalMs} starting from the
 * beginning of time..
 */
export function timeBasedId(intervalMs: number): number {
  const now = Date.now();
  const aliased = Math.floor(now / intervalMs) * intervalMs;
  return aliased;
}
