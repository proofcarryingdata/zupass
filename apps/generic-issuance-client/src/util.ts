import { APIResult } from "@pcd/passport-interface";

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
