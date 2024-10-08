import { expect } from "chai";
import "mocha";
import {
  bigintFromJSON,
  bigintToSimplestJSON,
  checkPODEntries,
  JSONPODEntries,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  PODEntries,
  podEntriesFromJSON,
  podEntriesToJSON
} from "../src";
import { expectedPublicKey, expectedPublicKeyHex } from "./common";

describe("podJSON conversions should work", async function () {
  it("PODEntries empty object should work", function () {
    expect(podEntriesToJSON({})).to.deep.eq({});
    expect(podEntriesFromJSON({})).to.deep.eq({});
  });

  it("PODEntries kitchen sink should work", function () {
    const jsonInput = {
      s1: "hello",
      s2: { string: "world" },

      is1: 123,
      is2: { int: 456 },

      isn1: -123,
      isn2: { int: -456 },

      ib1: { int: "9223372036854775123" },

      ibn1: { int: "-9223372036854775123" },

      cs1: { cryptographic: 456 },

      cb1: { cryptographic: "1234567890912345678901234567890" },

      pk1: { eddsa_pubkey: expectedPublicKey },
      pk2: { eddsa_pubkey: expectedPublicKeyHex }
    } satisfies JSONPODEntries;
    const parsedEntries = podEntriesFromJSON(jsonInput);
    expect(Object.keys(parsedEntries)).to.deep.eq(Object.keys(jsonInput));

    const expectedEntries = {
      s1: { type: "string", value: "hello" },
      s2: { type: "string", value: "world" },

      is1: { type: "int", value: 123n },
      is2: { type: "int", value: 456n },

      isn1: { type: "int", value: -123n },
      isn2: { type: "int", value: -456n },

      ib1: { type: "int", value: 9223372036854775123n },

      ibn1: { type: "int", value: -9223372036854775123n },

      cs1: { type: "cryptographic", value: 456n },

      cb1: { type: "cryptographic", value: 1234567890912345678901234567890n },

      pk1: { type: "eddsa_pubkey", value: expectedPublicKey },
      pk2: { type: "eddsa_pubkey", value: expectedPublicKeyHex }
    } satisfies PODEntries;
    expect(parsedEntries).to.deep.eq(expectedEntries);
    checkPODEntries(expectedEntries);

    const jsonOutput = podEntriesToJSON(parsedEntries);
    expect(Object.keys(jsonOutput)).to.deep.eq(Object.keys(jsonInput));

    const parsedEntries2 = podEntriesFromJSON(jsonOutput);
    expect(parsedEntries2).to.deep.eq(parsedEntries);
  });

  // TODO(artwyman): PODEntries negative test cases
  // TODO(artwyman): test suite for PODValue to/from JSON
  // TODO(artwyman): PODValue negative test cases
  // TODO(artwyman): test suite for podValueFromTypedJSON
  // TODO(artwyman): podValueFromTypedJSON negative test cases

  const bigintEncodedPairs = [
    [0n, 0],
    [1n, 1],
    [-1n, -1],
    [1234567890n, 1234567890],
    [-1234567890n, -1234567890],
    [BigInt(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
    [BigInt(Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER],
    [
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      "0x" + (BigInt(Number.MAX_SAFE_INTEGER) + 1n).toString(16)
    ],
    [
      BigInt(Number.MIN_SAFE_INTEGER) - 1n,
      (BigInt(Number.MIN_SAFE_INTEGER) - 1n).toString()
    ],
    [POD_INT_MAX, "0x" + POD_INT_MAX.toString(16)],
    [POD_INT_MIN, POD_INT_MIN.toString()],
    [POD_CRYPTOGRAPHIC_MAX, "0x" + POD_CRYPTOGRAPHIC_MAX.toString(16)],
    [POD_CRYPTOGRAPHIC_MIN, 0],

    // This function doesn't do any range checking
    [
      POD_CRYPTOGRAPHIC_MAX + 1n,
      "0x" + (POD_CRYPTOGRAPHIC_MAX + 1n).toString(16)
    ],
    [-(POD_CRYPTOGRAPHIC_MAX + 1n), (-(POD_CRYPTOGRAPHIC_MAX + 1n)).toString()]
  ] satisfies [bigint, number | string][];

  it("bigintFromJSON should work on valid input", async function () {
    for (const [output, input] of bigintEncodedPairs) {
      expect(bigintFromJSON(input)).to.eq(output);
    }
  });

  it("bigintFromJSON should reject invalid input", async function () {
    const invalidNumberResults = [
      [Number.MAX_SAFE_INTEGER + 1, RangeError],
      [Number.MIN_SAFE_INTEGER - 1, RangeError],
      [1.2345, RangeError],
      [-12345.6, RangeError],
      ["hello", SyntaxError],
      ["-0x12345", SyntaxError],
      [undefined as unknown as string, TypeError],
      [null as unknown as string, TypeError],
      [{} as unknown as number, TypeError]
    ] satisfies [number | string, ErrorConstructor][];
    for (const [input, errType] of invalidNumberResults) {
      const fn = (): bigint => bigintFromJSON(input);
      expect(fn).to.throw(errType);
    }
  });

  it("bigintToSimplestJSON should pick the best format", async function () {
    for (const [input, output] of bigintEncodedPairs) {
      expect(bigintToSimplestJSON(input)).to.eq(output);
    }
  });
});
