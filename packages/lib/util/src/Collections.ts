export function onlyDefined<T>(t: Array<T | undefined>): T[] {
  return t.filter((i) => !!i) as T[];
}
