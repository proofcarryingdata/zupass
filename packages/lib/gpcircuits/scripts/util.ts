import * as fs from "fs/promises";
import * as path from "path";

/**
 * Clears a directory.
 */
export async function clearDir(directory: string): Promise<void> {
  for (const file of await fs.readdir(directory)) {
    await fs.rm(path.join(directory, file));
  }
}
