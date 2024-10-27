import { requireEnv } from "@pcd/server-shared";
import { spawn } from "child_process";
import { PCDHTTPError } from "../routing/pcdHttpError";

/**
 * Generate a random 6-digit random token for use as a token.
 */
export function randomEmailToken(): string {
  const token = (((1 + Math.random()) * 1e6) | 0).toString().substring(1);
  if (token.length !== 6) throw new Error("Unreachable");
  return token;
}

export function isLocalServer(): boolean {
  return (
    process.env.PASSPORT_SERVER_URL === "http://localhost:3002" ||
    process.env.PASSPORT_SERVER_URL === "https://dev.local:3002"
  );
}

export function checkSlidingWindowRateLimit(
  timestamps: number[],
  maxRequestCount: number,
  timeWindowMs: number
): { rateLimitExceeded: boolean; newTimestamps: string[] } {
  const currentTime = Date.now();
  timestamps.push(currentTime);

  const startTime = currentTime - timeWindowMs;
  const requestsSinceStartTime = timestamps.filter((t) => t > startTime);

  return {
    rateLimitExceeded: requestsSinceStartTime.length > maxRequestCount,
    newTimestamps: requestsSinceStartTime.map((t) => new Date(t).toISOString())
  };
}

/**
 * Compares two arrays representing existing and potentially new or updated
 * items. Returns three arrays: new items, which are present in `b` but not
 * in `a`; updated items, which are present but different in both; and removed
 * items which are present in `a` but not in `b`.
 *
 * Takes two arrays to compare, an identifier which specifies a field on the
 * array items to use as a unique identifier, and a comparator function for
 * comparing items.
 *
 * Type T is the type of the item in the array, and I is the identifier
 * property.
 */
export function compareArrays<T>(
  a: T[],
  b: T[],
  identifier: keyof T,
  comparator: (a: T, b: T) => boolean
): {
  new: T[];
  updated: T[];
  removed: T[];
} {
  const aByIdentifier = new Map(a.map((item) => [item[identifier], item]));

  const newItems = b.filter((item) => !aByIdentifier.has(item[identifier]));

  const updatedItems = b.filter((item) => {
    const existingItem = aByIdentifier.get(item[identifier]);
    return existingItem && comparator(item, existingItem);
  });

  const bByIdentifier = new Map(b.map((item) => [item[identifier], item]));

  const removedItems = a.filter((item) => !bByIdentifier.has(item[identifier]));

  return {
    new: newItems,
    updated: updatedItems,
    removed: removedItems
  };
}

export function isValidEmoji(str: string): boolean {
  const emojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?\uFE0F?|\p{Emoji_Component}\uFE0F?)?$/u;
  return emojiRegex.test(str);
}

/**
 * Returns a URL that displays a custom error page on passport-client,
 * containing a title and description.
 */
export function getServerErrorUrl(title: string, description: string): string {
  const searchParams = new URLSearchParams({ title, description });
  const url = new URL("/#/server-error", requireEnv("PASSPORT_CLIENT_URL"));
  return `${url}?${searchParams.toString()}`;
}

/**
 * OSX only - copies data to clipboard
 */
export function pbcopy(data: string): void {
  const proc = spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
}

export function ensureDefined<T>(val: T | undefined, errorMessage?: string): T {
  if (val === undefined) {
    throw new Error(errorMessage ?? "Undefined value");
  }
  return val;
}

export function checkExistsForRoute(
  frogcryptoService: unknown | null
): asserts frogcryptoService {
  if (!frogcryptoService) {
    throw new PCDHTTPError(503, "service not instantiated");
  }
}

export function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    e instanceof AbortError
  );
}

export class AbortError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AbortError";
  }
}
