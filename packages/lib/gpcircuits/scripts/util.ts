import * as fs from "fs/promises";
import * as path from "path";

/**
 * Clears a directory.
 */
export async function clearDir(directory: string) {
  for (const file of await fs.readdir(directory)) {
    await fs.rm(path.join(directory, file));
  }
}

/** Maximum number of parallel promises to avoid
 * OOM issues.
 */
export const MAX_PARALLEL_PROMISES = 4;
w;
