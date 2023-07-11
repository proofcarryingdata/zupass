export function setIntersection(
  set1: Set<string>,
  set2: Set<string>
): Set<string> {
  const intersection = new Set<string>();

  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }

  return intersection;
}
