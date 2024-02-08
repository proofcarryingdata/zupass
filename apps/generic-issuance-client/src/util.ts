import { APIResult } from "@pcd/passport-interface";

export function getError(...results: APIResult[]): string | undefined {
  for (const result of results) {
    if (!result.success) {
      return result.error;
    }
  }
  return undefined;
}
