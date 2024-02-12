import { expect } from "chai";
import _ from "lodash";
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
 * Use in place of `expect(value).to.eq(true)`
 */
export function expectTrue(value: boolean): asserts value is true {
  if (value !== true) {
    throw new Error("Expected value to be true");
  }
}

/**
 * Use in place of `expect(value).to.eq(false)`
 */
export function expectFalse(value: boolean): asserts value is true {
  if (value !== false) {
    throw new Error("Expected value to be false");
  }
}

/**
 * Use in place of `expect(array.length).to.eq(length)`
 */
export function expectLength<T>(
  array: Array<T> | undefined,
  length: number
): void {
  if (!array) {
    throw new Error("expected array to exist");
  }

  if (array.length !== length) {
    throw new Error(
      `expected ${JSON.stringify(array, null, 2)} to have length ${length}`
    );
  }
}

/**
 * TypeScript complains if it thinks you're definitely calling `process.exit(0)`
 * in the middle of a function. This is a hack to get around the compiler complaining.
 * Should only be used in the process of developing tests.
 */
export function safeExit(): void {
  if (Math.random() < 2) {
    // eslint-disable-next-line no-console
    console.log("\n*************");
    // eslint-disable-next-line no-console
    console.log("* SAFE EXIT *");
    // eslint-disable-next-line no-console
    console.log("*************\n");
    process.exit(0);
  }
}

export function randomName(): string {
  const firstNames = ["Bob", "Steve", "Gub", "Mob", "Flub", "Jib", "Grub"];
  const lastNames = ["Froby", "Shmoby", "Glowby", "Brimby", "Slimbo", "Froggy"];
  return _.sample(firstNames) + " " + _.sample(lastNames);
}
