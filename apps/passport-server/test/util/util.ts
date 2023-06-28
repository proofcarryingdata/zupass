import { v4 as uuid } from "uuid";

export function randomEmail() {
  return uuid() + "@test.com";
}
