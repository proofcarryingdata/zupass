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
