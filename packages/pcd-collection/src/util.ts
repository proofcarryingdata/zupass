import { PCD, SerializedPCD } from "@pcd/pcd-types";
import Dirent from "memfs/lib/Dirent";
import { SnapshotNode } from "memfs/lib/snapshot";
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

export function snapshotNodeToDirectory(
  nodePath: string,
  node: SnapshotNode
): SerializedDirectory | undefined {
  if (!node) {
    return undefined;
  }

  if (node[0] !== 0 /* folder */) {
    return undefined;
  }

  const entryList = Object.entries(node[2]);

  return {
    name: path.parse(nodePath).name,
    path: nodePath,
    pcds: entryList
      .map(([_, v]) => {
        return snapshotNodeToFile(v);
      })
      .filter((pcd) => !!pcd) as SerializedPCD[],
    childDirectories: entryList
      .map(([k, v]) => {
        return snapshotNodeToDirectory(path.join(nodePath, k), v);
      })
      .filter((dir) => !!dir) as SerializedDirectory[]
  };
}

export function snapshotNodeToFile(
  node: SnapshotNode
): SerializedPCD | undefined {
  if (!node) {
    return undefined;
  }

  if (node[0] !== 1 /* file */) {
    return undefined;
  }

  const stringFileContents = Buffer.from(node[2]).toString("utf-8");
  const serializedPCD = JSON.parse(stringFileContents) as SerializedPCD;

  return serializedPCD;
}

export function getDirectoryFromSnapshot(
  snapshot: DeserializedDirectory,
  dirPath: string
): DeserializedDirectory | undefined {
  const parts = dirPath.split(path.sep).filter((d) => d !== "");
  let directory: DeserializedDirectory | undefined = snapshot;

  console.log("PARTS", parts);

  for (let i = 0; i < parts.length; i++) {
    directory = directory?.childDirectories.find((d) => d.name === parts[i]);
  }

  return directory;
}

export interface SerializedDirectory {
  name: string;
  path: string;
  pcds: SerializedPCD[];
  childDirectories: SerializedDirectory[];
}

export interface DeserializedDirectory {
  name: string;
  path: string;
  pcds: PCD[];
  childDirectories: DeserializedDirectory[];
}
