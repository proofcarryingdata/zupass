import { exec } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);

export async function getCommitHash(): Promise<string> {
  try {
    const result = await execAsync("git rev-parse HEAD", {
      cwd: process.cwd()
    });
    return result.stdout.trim();
  } catch (e) {
    console.log("couldn't get commit hash", e);
  }

  return "unknown commit hash";
}

/**
 * Ensures a given environment variable exists by throwing an error
 * if it doesn't.
 */
export function requireEnv(str: string): string {
  const val = process.env[str];
  if (val === null || val === undefined || val === "") {
    throw str;
  }
  return val;
}
