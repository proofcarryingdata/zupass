export function checkExists<T>(
  value?: T | null | undefined,
  errMsg?: string
): value is T {
  if (value == null) {
    throw new Error(errMsg ?? "expected to exist");
  }

  return true;
}
