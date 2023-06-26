export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function requireEnv(str: string): string {
  const val = process.env[str];
  if (val == null || val === "") {
    throw str;
  }
  return val;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function decodeString(
  s: any,
  name: string,
  predicate?: (s: string) => boolean
): string {
  if (s == null) {
    throw new Error(`Missing ${name}`);
  }
  if (typeof s !== "string" || (predicate && !predicate(s))) {
    throw new Error(`Invalid ${name}`);
  }
  return decodeURIComponent(s);
}

export function generateEmailToken(): string {
  // Generate a 6-digit random token.
  const token = (((1 + Math.random()) * 1e6) | 0).toString().substring(1);
  if (token.length !== 6) throw new Error("Unreachable");
  return token;
}
