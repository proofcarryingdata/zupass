import uniq from "lodash/uniq";

export const PATH_SEP = "/";

/**
 * Gets the list of folders that are direct descendants of a given
 * path, given a list of directories that are present. For example,
 * if the full list of paths is something like:
 *
 * a/b/c/d
 * a/b/q/r
 *
 * ... then this function would say that the list of child folders of
 * a/b is [a/b/c, a/b/q], even though a/b/c and a/b/q are not explicitly listed.
 */
export function getFoldersInFolder(
  folderPath: string,
  allPaths: string[]
): string[] {
  const descendantsOfFolder = uniq(
    allPaths.filter((p) => isFolderAncestor(p, folderPath))
  );

  const descendantsWithMissing = uniq([
    ...descendantsOfFolder.flatMap((path) => getAllAncestors(path)),
    ...descendantsOfFolder
  ]).filter((a) => a !== "");

  const directDescendants = descendantsWithMissing.filter((d) =>
    isChild(folderPath, d)
  );

  return directDescendants;
}

/**
 * For a path like a/b/c/d, returns a/b/c, a/b, a, and the root
 * denoted by "".
 */
export function getAllAncestors(path: string): string[] {
  const parts = splitPath(path);
  const result = [];

  while (parts.length > 0) {
    parts.pop();
    result.push(parts.join(PATH_SEP));
  }

  return result;
}

/**
 * Checks that a particular child path is a direct child of a
 * particular parent.
 */
export function isChild(parent: string, child: string): boolean {
  const normalizedPath = normalizePath(parent);
  const descendantParts = splitPath(child);
  descendantParts.pop();

  if (normalizedPath === descendantParts.join(PATH_SEP)) {
    return true;
  }

  return false;
}

/**
 * Checks if {@link possibleAncestor} has {@link possibleDescendant} as a
 * descendant.
 * eg. a/b/c/d is a descendant of a/b, but not of a/q.
 */
export function isFolderAncestor(
  possibleDescendant: string,
  possibleAncestor: string
): boolean {
  const pathParts = splitPath(possibleDescendant);
  const folderParts = splitPath(possibleAncestor);

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

/**
 * Splits a path via the path separator.
 */
export function splitPath(path: string): string[] {
  return path.split(PATH_SEP).filter((p) => p !== "");
}

/**
 * Joins path segments with the separator, escaping each segment.
 */
export function joinPath(...segments: string[]): string {
  return segments.map(escapePathSegment).join(PATH_SEP);
}

/**
 * Removes unnecessary path separators from a path.
 */
export function normalizePath(path: string): string {
  return splitPath(path).join(PATH_SEP);
}

/**
 * For a path like a/b/c, returns a/b. for the root returns the root.
 */
export function getParentFolder(folderPath: string): string {
  const parts = splitPath(folderPath);
  parts.pop();
  return parts.join(PATH_SEP);
}

/**
 * Returns whether or not this path is the root. Root canonically
 * represented by an empty string, but also normalizes from /, //, ///, etc.
 */
export function isRootFolder(folderPath: string): boolean {
  return normalizePath(folderPath) === "";
}

/**
 * Gets the last path segment of a path. Eg. a/b/c would return c.
 * For root, returns root.
 */
export function getNameFromPath(path: string): string {
  const parts = splitPath(path);

  if (parts.length === 0) {
    return "";
  }

  return parts[parts.length - 1];
}

/**
 * Removes any path separators from a file name.
 */
export function escapePathSegment(name: string): string {
  return name.replace(/\//g, "");
}
