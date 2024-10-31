import { expect } from "chai";
import "mocha";
import {
  bigintFromJSON,
  bigintToSimplestJSON,
  checkPODEntries,
  JSONPODEntries,
  JSONPODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  PODEntries,
  podEntriesFromJSON,
  podEntriesToJSON,
  PODValue,
  podValueFromJSON,
  podValueFromTypedJSON,
  podValueToJSON
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

      by1: { bytes: "AQID" },
      by2: { bytes: "aGVsbG8" },

      cs1: { cryptographic: 456 },

      cb1: { cryptographic: "1234567890912345678901234567890" },

      is1: 123,
      is2: { int: 456 },

      isn1: -123,
      isn2: { int: -456 },

      ib1: { int: "9223372036854775123" },

      ibn1: { int: "-9223372036854775123" },

      b0: false,
      b1: { boolean: true },

      pk1: { eddsa_pubkey: expectedPublicKey },
      pk2: { eddsa_pubkey: expectedPublicKeyHex },

      d1: { date: "2024Z" },
      d2: { date: "2024-10-25T04:01:00.638Z" },

      n1: null,
      n2: { null: null }
    } satisfies JSONPODEntries;
    const parsedEntries = podEntriesFromJSON(jsonInput);
    expect(Object.keys(parsedEntries)).to.deep.eq(Object.keys(jsonInput));

    const expectedEntries = {
      s1: { type: "string", value: "hello" },
      s2: { type: "string", value: "world" },

      by1: { type: "bytes", value: new Uint8Array([1, 2, 3]) },
      by2: { type: "bytes", value: Buffer.from("hello") },

      cs1: { type: "cryptographic", value: 456n },

      cb1: { type: "cryptographic", value: 1234567890912345678901234567890n },

      is1: { type: "int", value: 123n },
      is2: { type: "int", value: 456n },

      isn1: { type: "int", value: -123n },
      isn2: { type: "int", value: -456n },

      ib1: { type: "int", value: 9223372036854775123n },

      ibn1: { type: "int", value: -9223372036854775123n },

      b0: { type: "boolean", value: false },
      b1: { type: "boolean", value: true },

      pk1: { type: "eddsa_pubkey", value: expectedPublicKey },
      pk2: { type: "eddsa_pubkey", value: expectedPublicKeyHex },

      d1: { type: "date", value: new Date(Date.UTC(2024)) },
      d2: { type: "date", value: new Date("2024-10-25T04:01:00.638Z") },

      n1: { type: "null", value: null },
      n2: { type: "null", value: null }
    } satisfies PODEntries;
    expect(parsedEntries).to.deep.eq(expectedEntries);
    checkPODEntries(expectedEntries);

    const jsonOutput = podEntriesToJSON(parsedEntries);
    expect(Object.keys(jsonOutput)).to.deep.eq(Object.keys(jsonInput));

    const parsedEntries2 = podEntriesFromJSON(jsonOutput);
    expect(parsedEntries2).to.deep.eq(parsedEntries);
  });

  it("podEntriesFromJSON should reject invalid inputs", function () {
    const badInputs = [
      [undefined as unknown as JSONPODEntries, TypeError],
      [null as unknown as JSONPODEntries, TypeError],
      [[1, 2, 3] as unknown as JSONPODEntries, TypeError],
      [{ "!@#$%$one": 1 } as JSONPODEntries, TypeError],
      [{ one: 1n } as unknown as JSONPODEntries, TypeError],
      [
        {
          one: Number.MAX_SAFE_INTEGER + 1
        } as unknown as JSONPODEntries,
        RangeError
      ]
    ] satisfies [JSONPODEntries, ErrorConstructor][];
    for (const [input, expectedError] of badInputs) {
      const fn = (): PODEntries => podEntriesFromJSON(input);
      expect(fn).to.throw(expectedError);
    }
  });

  it("podEntriesToJSON should reject invalid types", function () {
    const badInputs = [
      [undefined as unknown as PODEntries, TypeError],
      [null as unknown as PODEntries, TypeError],
      [[1, 2, 3] as unknown as PODEntries, TypeError],
      [{ "!@#$%$one": { type: "int", value: 1n } } as PODEntries, TypeError],
      [{ one: { type: "int", value: 1 } } as unknown as PODEntries, TypeError]
    ] satisfies [PODEntries, ErrorConstructor][];
    for (const [input, expectedError] of badInputs) {
      const fn = (): JSONPODEntries => podEntriesToJSON(input);
      expect(fn).to.throw(expectedError);
    }
  });

  it("PODValue JSON conversion should round-trip properly", function () {
    const testValues = [
      "hello",
      { string: "world" },

      { bytes: "AQID" },
      { bytes: "aGVsbG8" },

      { cryptographic: 456 },
      { cryptographic: "1234567890912345678901234567890" },

      123,
      { int: 456 },

      -123,
      { int: -456 },

      { int: "9223372036854775123" },
      { int: "-9223372036854775123" },

      false,
      { boolean: true },

      { eddsa_pubkey: expectedPublicKey },
      { eddsa_pubkey: expectedPublicKeyHex },

      { date: "2024Z" },
      { date: "2024-10-25T04:01:00.638Z" },

      null,
      { null: null }
    ] satisfies JSONPODValue[];
    const expectedValues = [
      { type: "string", value: "hello" },
      { type: "string", value: "world" },

      { type: "bytes", value: new Uint8Array([1, 2, 3]) },
      { type: "bytes", value: Buffer.from("hello") },

      { type: "cryptographic", value: 456n },
      { type: "cryptographic", value: 1234567890912345678901234567890n },

      { type: "int", value: 123n },
      { type: "int", value: 456n },

      { type: "int", value: -123n },
      { type: "int", value: -456n },

      { type: "int", value: 9223372036854775123n },
      { type: "int", value: -9223372036854775123n },

      { type: "boolean", value: false },
      { type: "boolean", value: true },

      { type: "eddsa_pubkey", value: expectedPublicKey },
      { type: "eddsa_pubkey", value: expectedPublicKeyHex },

      { type: "date", value: new Date(Date.UTC(2024)) },
      { type: "date", value: new Date("2024-10-25T04:01:00.638Z") },

      { type: "null", value: null },
      { type: "null", value: null }
    ] satisfies PODValue[];

    for (let i = 0; i < testValues.length; i++) {
      const parsedValue = podValueFromJSON(testValues[i]);
      expect(parsedValue).to.deep.eq(expectedValues[i]);
      const roundTripValue = podValueFromJSON(podValueToJSON(parsedValue));
      expect(roundTripValue).to.deep.eq(expectedValues[i]);
    }
  });

  it("podValueToJSON should pick smallest format", function () {
    const expectedInputOutput = [
      [{ type: "string", value: "hello" }, "hello"],
      [{ type: "cryptographic", value: 456n }, { cryptographic: 456 }],
      [
        { type: "cryptographic", value: 1234567890912345678901234567890n },
        { cryptographic: "0xf951a9fce668f22f345ef0ad2" }
      ],
      [{ type: "int", value: 123n }, 123],
      [
        { type: "int", value: 9223372036854775123n },
        { int: "0x7ffffffffffffd53" }
      ],
      [
        { type: "int", value: -9223372036854775123n },
        { int: "-9223372036854775123" }
      ],
      [{ type: "boolean", value: true }, true],
      [{ type: "null", value: null }, null]
    ] satisfies [PODValue, JSONPODValue][];

    for (const [input, output] of expectedInputOutput) {
      expect(podValueToJSON(input)).to.deep.eq(output);
    }
  });

  it("podValueFromJSON should reject invalid inputs", function () {
    const nameForErrorMessages = "expectedName";
    const badInputs = [
      [undefined as unknown as JSONPODValue, TypeError],
      [{} as unknown as JSONPODValue, TypeError],
      [[1] as unknown as JSONPODValue, TypeError],
      [Number.MAX_SAFE_INTEGER + 1, RangeError],
      [Number.MIN_SAFE_INTEGER - 1, RangeError],
      [{ type: "int", value: 1 } as unknown as JSONPODValue, TypeError],
      [{ one: 1, two: 2, three: 3 } as unknown as JSONPODValue, TypeError]
    ] satisfies [JSONPODValue, ErrorConstructor][];

    for (const [badInput, expectedError] of badInputs) {
      const fn = (): PODValue =>
        podValueFromJSON(badInput, nameForErrorMessages);
      expect(fn).to.throw(expectedError, nameForErrorMessages);
    }
  });

  it("podValueToJSON should reject invalid input types", function () {
    const nameForErrorMessages = "expectedName";
    const badInputs = [
      [undefined as unknown as PODValue, TypeError],
      [null as unknown as PODValue, TypeError],
      [{} as unknown as PODValue, TypeError],
      [[1] as unknown as PODValue, TypeError],
      [{ type: "int", value: undefined } as unknown as PODValue, TypeError],
      [{ type: "int", value: null } as unknown as PODValue, TypeError],
      [{ type: "int", value: 1 } as unknown as PODValue, TypeError],
      [{ one: 1, two: 2, three: 3 } as unknown as PODValue, TypeError],
      [{ type: "foo", value: "hello" } as unknown as PODValue, TypeError]
    ] satisfies [PODValue, ErrorConstructor][];

    for (const [badInput, expectedError] of badInputs) {
      const fn = (): JSONPODValue =>
        podValueToJSON(badInput, nameForErrorMessages);
      expect(fn).to.throw(expectedError, nameForErrorMessages);
    }
  });

  it("podValueFromTypedJSON should process valid inputs", function () {
    const testValues = [
      ["string", "hello"],

      ["bytes", "AQID"],

      ["cryptographic", 456],
      ["cryptographic", "1234567890912345678901234567890"],

      ["int", 123],

      ["int", -123],

      ["int", "9223372036854775123"],
      ["int", "-9223372036854775123"],

      ["boolean", true],
      ["boolean", false],

      ["eddsa_pubkey", expectedPublicKey],
      ["eddsa_pubkey", expectedPublicKeyHex],

      ["date", "2024Z"],
      ["date", "2024-10-25T04:01:00.638Z"],

      ["null", null]
    ] satisfies [string, number | string | boolean | null][];
    const expectedValues = [
      { type: "string", value: "hello" },

      { type: "bytes", value: new Uint8Array([1, 2, 3]) },

      { type: "cryptographic", value: 456n },
      { type: "cryptographic", value: 1234567890912345678901234567890n },

      { type: "int", value: 123n },
      { type: "int", value: -123n },

      { type: "int", value: 9223372036854775123n },
      { type: "int", value: -9223372036854775123n },

      { type: "boolean", value: true },
      { type: "boolean", value: false },

      { type: "eddsa_pubkey", value: expectedPublicKey },
      { type: "eddsa_pubkey", value: expectedPublicKeyHex },

      { type: "date", value: new Date(Date.UTC(2024)) },
      { type: "date", value: new Date("2024-10-25T04:01:00.638Z") },

      { type: "null", value: null }
    ] satisfies PODValue[];

    for (let i = 0; i < testValues.length; i++) {
      expect(
        podValueFromTypedJSON(testValues[i][0], testValues[i][1])
      ).to.deep.eq(expectedValues[i]);
    }
  });

  it("podValueFromTypedJSON should reject invalid inputs", function () {
    const nameForErrorMessages = "expectedName";
    const badInputs = [
      [undefined as unknown as string, 123, TypeError],
      [null as unknown as string, 123, TypeError],
      ["string", 123, TypeError],
      ["string", null, TypeError],
      ["bytes", 123, TypeError],
      ["bytes", "!@#$%^&*()", TypeError],
      ["cryptographic", "hello", SyntaxError],
      ["cryptographic", Number.MAX_SAFE_INTEGER + 1, RangeError],
      ["cryptographic", Number.MIN_SAFE_INTEGER - 1, RangeError],
      ["int", "hello", SyntaxError],
      ["int", 123n as unknown as number, TypeError],
      ["int", Number.MAX_SAFE_INTEGER + 1, RangeError],
      ["int", Number.MIN_SAFE_INTEGER - 1, RangeError],
      ["eddsa_pubkey", 123, TypeError],
      ["eddsa_pubkey", "hello", TypeError],
      ["date", "2024-10-24", TypeError],
      ["date", "2024-10-25T04:01:00.638+01:00", TypeError],
      ["null", "hello", TypeError]
    ] satisfies [string, number | string | boolean | null, ErrorConstructor][];

    for (const [badType, badValue, expectedError] of badInputs) {
      const fn = (): PODValue =>
        podValueFromTypedJSON(badType, badValue, nameForErrorMessages);
      expect(fn).to.throw(
        expectedError,
        expectedError === SyntaxError ? undefined : nameForErrorMessages
      );
    }
  });

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
    const nameForErrorMessages = "expectedName";
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
      const fn = (): bigint => bigintFromJSON(input, nameForErrorMessages);
      expect(fn).to.throw(errType);
    }
  });

  it("bigintToSimplestJSON should pick the best format", async function () {
    for (const [input, output] of bigintEncodedPairs) {
      expect(bigintToSimplestJSON(input)).to.eq(output);
    }
  });
});
