import { expect } from "chai";
import { v4 as uuid } from "uuid";

export function randomEmail(): string {
  return uuid() + "@test.com";
}

/**
 * Use in place of `expect(value).to.exist`
 *
 * Work-around for Chai assertions not being recognized by TypeScript's control flow analysis.
 * @param {any} value
 */
export function expectToExist<T, U extends T = T>(
  value: T | undefined,
  typeNarrower: (value: T) => value is U
): asserts value is NonNullable<U>;
export function expectToExist<T>(
  value: T | undefined
): asserts value is NonNullable<T>;
export function expectToExist<T, U extends T = T>(
  value: T | undefined,
  typeNarrower?: (value: T) => value is U
): asserts value is NonNullable<U> {
  expect(value).to.exist;
  if (value === null || value === undefined) {
    throw new Error("Expected value to exist");
  }
  if (typeNarrower && !typeNarrower(value)) {
    throw new Error("Expected value to be narrowable to U");
  }
}

/**
 * TypeScript complains if it thinks you're definitely calling `process.exit(0)`
 * in the middle of a function. This is a hack to get around the compiler complaining.
 * Should only be used in the process of developing tests.
 */
export function safeExit(): void {
  if (Math.random() < 2) {
    process.exit(0);
  }
}
