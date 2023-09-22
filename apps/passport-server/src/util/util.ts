import { exec } from "child_process";
import validator from "email-validator";
import { promisify } from "util";
import { logger } from "./logger";

export const execAsync = promisify(exec);

/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * Ensures a given environment variable exists by throwing an error
 * if it doesn't.
 */
export function requireEnv(str: string): string {
  const val = process.env[str];
  if (val == null || val === "") {
    throw str;
  }
  return val;
}

/**
 * Normalizes email so that equivalent emails can be compared.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Decodes a given string from an object `s` and optionally valides it.
 */
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

/**
 * Generate a random 6-digit random token for use as a token.
 */
export function randomEmailToken(): string {
  const token = (((1 + Math.random()) * 1e6) | 0).toString().substring(1);
  if (token.length !== 6) throw new Error("Unreachable");
  return token;
}

export function validateEmail(email: string): boolean {
  return validator.validate(email);
}

export async function getCommitHash(): Promise<string> {
  try {
    const result = await execAsync("git rev-parse HEAD", {
      cwd: process.cwd()
    });
    return result.stdout.trim();
  } catch (e) {
    logger("couldn't get commit hash", e);
  }

  return "unknown commit hash";
}

export function isLocalServer(): boolean {
  // eslint-disable-next-line no-console
  console.log(`.env loaded?`, process.env.PASSPORT_SERVER_URL);
  return (
    process.env.PASSPORT_SERVER_URL === "http://localhost:3002" ||
    process.env.PASSPORT_SERVER_URL === "https://dev.local:3002"
  );
}
