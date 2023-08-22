import Dirent from "memfs/lib/Dirent";
import { Volume } from "memfs/lib/volume";
import * as path from "path";

export function isDirent(entry: unknown): entry is Dirent {
  return (entry as any)?.isDirectory !== undefined;
}

export function joinMany(childNames: string[], dirPath: string): string[] {
  return childNames.map((name) => path.join(dirPath, name));
}

export function readFiles(volume: Volume, paths: string[]): string[] {
  return paths.map((path) =>
    volume.readFileSync(path, { encoding: "utf-8" }).toString()
  );
}

export function filesInDirectory(volume: Volume, dirPath: string): string[] {
  const entries: unknown[] = volume.readdirSync(dirPath, {
    withFileTypes: true
  });
  return joinMany(
    entries
      .filter(isDirent)
      .filter((e) => e.isFile())
      .map((d) => d.name.toString()),
    dirPath
  );
}

export function directoriesInDirectory(
  volume: Volume,
  dirPath: string
): string[] {
  const entries: unknown[] = volume.readdirSync(dirPath, {
    withFileTypes: true
  });
  return joinMany(
    entries
      .filter(isDirent)
      .filter((e) => e.isDirectory())
      .map((d) => d.name.toString()),
    dirPath
  );
}

export function checkExists(volume: Volume, path: string): void {
  const exists = volume.existsSync(path);
  if (!exists) {
    throw new Error(`${path} does not exist`);
  }
}

export function checkIsDirectory(volume: Volume, path: string): void {
  checkExists(volume, path);

  const isDirectory = volume.statSync(path).isDirectory();
  if (!isDirectory) {
    throw new Error(`${path} is not a directory`);
  }
}
