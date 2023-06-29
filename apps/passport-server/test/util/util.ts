import { v4 as uuid } from "uuid";

export function randomEmail(): string {
  return uuid() + "@test.com";
}
