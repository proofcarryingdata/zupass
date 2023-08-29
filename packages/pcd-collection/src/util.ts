import _ from "lodash";

export function getFoldersInFolder(
  folderPath: string,
  allPaths: string[]
): string[] {
  return _.uniq(allPaths.filter((p) => isFolderAncestor(p, folderPath)));
}

export function getAllAncestors(path: string): string[] {
  const parts = splitPath(path);
  const result = [];

  while (parts.length > 0) {
    parts.pop();
    result.push(parts.join("/"));
  }

  return result;
}

export function isFolderAncestor(path: string, folderPath: string): boolean {
  const pathParts = splitPath(path);
  const folderParts = splitPath(folderPath);

  if (folderParts.length >= pathParts.length) {
    return false;
  }

  for (let i = 0; i < folderParts.length; i++) {
    if (folderParts[i] !== pathParts[i]) {
      return false;
    }
  }

  return true;
}

export function splitPath(path: string): string[] {
  return path.split("/").filter((p) => p !== "");
}

export function normalizePath(path: string): string {
  return splitPath(path).join("/");
}

export function getParentFolder(folderPath: string): string {
  const parts = splitPath(folderPath);
  parts.pop();
  return parts.join("/");
}

export function isRootFolder(folderPath: string): boolean {
  return normalizePath(folderPath) === "";
}
