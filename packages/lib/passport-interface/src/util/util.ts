import { APIResult } from "../api/apiResult";

/**
 * Returns the first error from a list of {@link APIResult}s.
 */
export function getError(
  ...results: (APIResult | undefined)[]
): string | undefined {
  for (const result of results) {
    if (result && !result.success) {
      return result.error;
    }
  }
  return undefined;
}
