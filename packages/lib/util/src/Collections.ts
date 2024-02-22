export function existing<T>(list: Array<T | undefined>): Array<T> {
  return list.filter((t) => t !== undefined) as T[];
}
