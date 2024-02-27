import { v4 as uuid } from "uuid";

export function randomUUID(): string {
  return uuid();
}
