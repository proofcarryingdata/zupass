import { promises as fs } from "fs";

interface FileCacheData {
  content: string;
  mtime: number;
}

export const readFileWithCache = (() => {
  const cache = new Map<string, FileCacheData>();

  return async (filePath: string): Promise<string> => {
    const stats = await fs.stat(filePath);
    const lastModified = stats.mtimeMs; // Last modified time in milliseconds

    // Check if file is in cache and has not changed
    const cachedData = cache.get(filePath);
    if (cachedData) {
      if (cachedData.mtime === lastModified) {
        return cachedData.content;
      }
    }

    // Read file from disk if not cached or modified
    const content = await fs.readFile(filePath, "utf8");
    cache.set(filePath, { content, mtime: lastModified });
    return content;
  };
})();
