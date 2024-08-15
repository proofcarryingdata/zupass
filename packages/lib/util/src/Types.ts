export function assertUnreachable(_: never, message?: string): never {
  throw new Error(message ?? "Unreachable");
}
