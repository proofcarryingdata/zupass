import { expect } from "chai";
import "mocha";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODName,
  PODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_VALUE_STRING_TYPE_IDENTIFIER,
  checkBigintBounds,
  checkPODName,
  checkPODValue,
  checkPrivateKeyFormat,
  checkPublicKeyFormat,
  checkSignatureFormat,
  cloneOptionalPODValue,
  clonePODEntries,
  clonePODValue,
  deserializePODEntries,
  getPODValueForCircuit,
  isPODNumericValue,
  podEntriesFromSimplifiedJSON,
  podEntriesToSimplifiedJSON,
  podValueFromRawValue,
  podValueToRawValue,
  requireValueType,
  serializePODEntries
} from "../src";
import {
  expectedPublicKey,
  expectedSignature1,
  expectedSignature2,
  privateKey,
  sampleEntries1,
  sampleEntries2,
  testPrivateKeys
} from "./common";

describe("podUtil input checkers should work", async function () {
  it("checkPrivateKeyFormat should accept valid inputs", function () {
    for (const testPrivateKey of testPrivateKeys) {
      const checked = checkPrivateKeyFormat(testPrivateKey);
      expect(checked).to.eq(testPrivateKey);
    }
  });

  it("checkPrivateKeyFormat should reject invalid inputs", function () {
    const badPrivateKeys = [
      "",
      "password",
      "00112233445566778899XXYYCCDDEEFF00112233445566778899xxyyccddeeff",
      "IIJJDDCCBBAA99887766554433221100iijjddccbbaa99887766554433221100",
      undefined as unknown as string,
      123 as unknown as string,
      123n as unknown as string,
      Buffer.from(privateKey, "hex") as unknown as string
    ];
    for (const testPrivateKey of badPrivateKeys) {
      const fn = (): void => {
        checkPrivateKeyFormat(testPrivateKey);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("checkPublicKeyFormat should accept valid inputs", function () {
    // This function validates format, not contents, so the keys don't have
    // to be points on the curve.
    const testPublicKeys = [
      expectedPublicKey,
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100"
    ];
    for (const testPublicKey of testPublicKeys) {
      const checked = checkPublicKeyFormat(testPublicKey);
      expect(checked).to.eq(testPublicKey);
    }
  });

  it("checkPublicKeyFormat should reject invalid inputs", function () {
    const badPublicKeys = [
      "",
      "password",
      "00112233445566778899XXYYCCDDEEFF00112233445566778899xxyyccddeeff",
      "IIJJDDCCBBAA99887766554433221100iijjddccbbaa99887766554433221100",
      undefined as unknown as string,
      123 as unknown as string,
      123n as unknown as string,
      Buffer.from(privateKey, "hex") as unknown as string
    ];
    for (const testPublicKey of badPublicKeys) {
      const fn = (): void => {
        checkPublicKeyFormat(testPublicKey);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("checkSignatureFormat should accept valid inputs", function () {
    // This function validates format, not contents, so the sigs don't have
    // to be points on the curve.
    const testSignatures = [
      expectedSignature1,
      expectedSignature2,
      "00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff",
      "FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100FFEEDDCCBBAA99887766554433221100ffeeddccbbaa99887766554433221100"
    ];
    for (const testSignature of testSignatures) {
      const checked = checkSignatureFormat(testSignature);
      expect(checked).to.eq(testSignature);
    }
  });

  it("checkSignatureFormat should reject invalid inputs", function () {
    const badSignatures = [
      "",
      "password",
      "00112233445566778899XXYYCCDDEEFF00112233445566778899xxyyccddeeff00112233445566778899XXYYCCDDEEFF00112233445566778899xxyyccddeeff",
      "IIJJDDCCBBAA99887766554433221100iijjddccbbaa99887766554433221100IIJJDDCCBBAA99887766554433221100iijjddccbbaa99887766554433221100",
      undefined as unknown as string,
      123 as unknown as string,
      123n as unknown as string,
      Buffer.from(privateKey, "hex") as unknown as string
    ];
    for (const testSignature of badSignatures) {
      const fn = (): void => {
        checkSignatureFormat(testSignature);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("checkPODName should accept valid inputs", function () {
    const testNames = [
      "validCamelCase",
      "ALL_CAPS_IDENTIFIER",
      "_prefix",
      "_",
      "A",
      "a",
      "_1",
      "abc123",
      "xyz123abc",
      "no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_",
      "pod_type"
    ];
    for (const testName of testNames) {
      const checked = checkPODName(testName);
      expect(checked).to.eq(testName);
    }
  });

  it("checkPODName should reject invalid inputs", function () {
    const badNames = [
      "",
      "1",
      "0x123",
      "123abc",
      "1_2_3",
      "foo.bar.baz",
      "foo:bar",
      ":",
      "!bang",
      "no spaces",
      "no\ttabs",
      undefined as unknown as string,
      123 as unknown as string,
      123n as unknown as string,
      Buffer.from(privateKey, "hex") as unknown as string
    ];
    for (const badName of badNames) {
      const fn = (): void => {
        checkPODName(badName);
      };
      expect(fn).to.throw(TypeError);
    }
  });

  it("requireType should accept valid inputs", function () {
    const testCases = [
      [0n, "bigint"],
      [-123n, "bigint"],
      ["", "string"],
      ["hello", "string"]
    ] as [string | bigint, string][];
    for (const testInput of testCases) {
      const checked = requireValueType("valueName", testInput[0], testInput[1]);
      expect(checked).to.eq(testInput[0]);
    }
  });

  it("requireType should reject invalid inputs", function () {
    const testCases = [
      [0n, "string"],
      [-123n, "number"],
      [123, "bigint"],
      [0n, "string"],
      ["hello", "bigint"],
      [undefined, "bigint"],
      [undefined, "string"]
    ] as [string | bigint, string][];
    for (const testInput of testCases) {
      const fn = (): void => {
        requireValueType("valueName", testInput[0], testInput[1]);
      };
      expect(fn).to.throw(TypeError, "valueName");
    }
  });

  it("checkBigintBounds should accept valid inputs", function () {
    const testCases = [
      [0n, 0n, 0n],
      [123n, 100n, 200n],
      [-1n, -123n, 123n],
      [0n, 0n, 0xffffffff_ffffffffn],
      [0xffffffff_ffffffffn, 0n, 0xffffffff_ffffffffn]
    ];
    for (const testInput of testCases) {
      const checked = checkBigintBounds(
        "valueName",
        testInput[0],
        testInput[1],
        testInput[2]
      );
      expect(checked).to.eq(testInput[0]);
    }
  });

  it("checkBigintBounds should reject invalid inputs", function () {
    const testCases = [
      [1n, 0n, 0n],
      [-1n, 0n, 0n],
      [99n, 100n, 200n],
      [201n, 100n, 200n],
      [-123n, -1n, 123n],
      [-1n, 0n, 0xffffffff_ffffffffn],
      [0x1_00000000_00000000n, 0n, 0xffffffff_ffffffffn]
    ];
    for (const testInput of testCases) {
      const fn = (): void => {
        checkBigintBounds(
          "valueName",
          testInput[0],
          testInput[1],
          testInput[2]
        );
      };
      expect(fn).to.throw(TypeError, "valueName");
    }
  });

  it("checkPODValue should accept samples", function () {
    for (const e of [sampleEntries1, sampleEntries2]) {
      for (const v of Object.values(e)) {
        const checked = checkPODValue("valueName", v);
        expect(checked).to.eq(v);
      }
    }
  });

  it("checkPODValue should accept valid inputs", function () {
    const testCases = [
      { type: "string", value: "hello" },
      { type: "string", value: "!@#$%^&*()_+[]{};':" },
      { type: "string", value: " spaces are okay\t" },
      {
        type: "string",
        value:
          "no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_"
      },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "4f5fb4898c477d8c17227ddd81eb597125e4d437489c01a6085b5db54e053b0a"
      },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "09ba237eb49e4552da3bf5260f8ca8a9a9055c41aad47ef564de4bb1a5cba619"
      },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "ce1c9c187ad59b5a324020ab503e783bc95bc268cb1b03cb5c7be91f1e4e8917"
      },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      },
      { type: "cryptographic", value: 0n },
      { type: "cryptographic", value: 123n },
      { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MIN },
      { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MAX },
      { type: "int", value: 0n },
      { type: "int", value: 123n },
      { type: "int", value: POD_INT_MIN },
      { type: "int", value: POD_INT_MAX }
    ] as (undefined | PODValue)[];
    for (const testInput of testCases) {
      const checked = checkPODValue("valueName", testInput);
      expect(checked).to.eq(testInput);
    }
  });

  it("checkPODValue should reject invalid inputs", function () {
    const testCases = [
      undefined,
      {},
      { type: "int" },
      { value: 0n },
      { type: undefined, value: 0n },
      { type: "string", value: undefined },
      { type: "something", value: 0n },
      { type: "bigint", value: 0n },
      { type: "something", value: "something" },
      { type: "string", value: 0n },
      { type: "string", value: 123 },
      { type: EDDSA_PUBKEY_TYPE_STRING, value: "hello" },
      { type: EDDSA_PUBKEY_TYPE_STRING, value: "0" },
      { type: EDDSA_PUBKEY_TYPE_STRING, value: 0n },
      { type: "cryptographic", value: "hello" },
      { type: "cryptographic", value: 123 },
      { type: "cryptographic", value: -1n },
      { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MIN - 1n },
      { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MAX + 1n },
      { type: "int", value: "hello" },
      { type: "int", value: 123 },
      { type: "int", value: -1n },
      { type: "int", value: POD_INT_MIN - 1n },
      { type: "int", value: POD_INT_MAX + 1n }
    ] as (undefined | PODValue)[];
    for (const testInput of testCases) {
      const fn = (): void => {
        checkPODValue("valueName", testInput);
      };
      expect(fn).to.throw(TypeError, "valueName");
    }
  });
});

describe("podUtil value helpers should work", async function () {
  it("isPODNumericValue should work", function () {
    expect(isPODNumericValue({ type: "string", value: "foo" })).to.be.false;
    expect(
      isPODNumericValue({
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      })
    ).to.be.false;
    expect(isPODNumericValue({ type: "int", value: 123n })).to.be.true;
    expect(isPODNumericValue({ type: "cryptographic", value: 123n })).to.be
      .true;
    expect(
      isPODNumericValue({
        type: "something",
        value: 123n
      } as unknown as PODValue)
    ).to.be.false;
  });

  it("getPODValueForCircuit should work", function () {
    expect(getPODValueForCircuit({ type: "string", value: "foo" })).to.be
      .undefined;
    expect(
      getPODValueForCircuit({
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      })
    ).to.be.undefined;
    expect(getPODValueForCircuit({ type: "int", value: 123n })).to.eq(123n);
    expect(
      getPODValueForCircuit({ type: "cryptographic", value: 0xffffn })
    ).to.eq(0xffffn);
    expect(
      getPODValueForCircuit({
        type: "something",
        value: 123n
      } as unknown as PODValue)
    ).to.be.undefined;
  });

  it("clonePODValue should return a new object", function () {
    const testCases = [
      { type: "string", value: "hello" },
      { type: "cryptographic", value: 0n },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      },
      { type: "int", value: 123n }
    ] as PODValue[];
    for (const testInput of testCases) {
      const cloned = clonePODValue(testInput);
      expect(cloned).to.not.eq(testInput);
      expect(cloned).to.deep.eq(testInput);
    }
  });

  it("cloneOptionalPODValue should return a new object", function () {
    const testCases = [
      { type: "string", value: "hello" },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      },
      { type: "cryptographic", value: 0n },
      { type: "int", value: 123n }
    ] as PODValue[];
    for (const testInput of testCases) {
      const cloned = cloneOptionalPODValue(testInput);
      expect(cloned).to.not.eq(testInput);
      expect(cloned).to.deep.eq(testInput);
    }
  });

  it("cloneOptionalPODValue should handle undefined", function () {
    const cloned = cloneOptionalPODValue(undefined);
    expect(cloned).to.be.undefined;
  });

  it("clonePODEntries should return all new objects", function () {
    for (const testEntries of [sampleEntries1, sampleEntries2]) {
      const cloned = clonePODEntries(testEntries);
      expect(cloned).to.not.eq(testEntries);
      expect(cloned).to.deep.eq(testEntries);

      for (const [name, value] of Object.entries(cloned)) {
        expect(value).to.not.eq(
          (testEntries as Record<PODName, PODValue>)[name]
        );
        expect(value).to.deep.eq(
          (testEntries as Record<PODName, PODValue>)[name]
        );
      }
    }
  });
});

describe("podUtil serialization should work", async function () {
  it("Default serialization should round-trip samples with exact types", function () {
    for (const testEntries of [sampleEntries1, sampleEntries2]) {
      const serialized = serializePODEntries(testEntries);
      const deserialized = deserializePODEntries(serialized);
      expect(deserialized).to.not.eq(testEntries);
      expect(deserialized).to.deep.eq(testEntries);
    }
  });

  it("Simplified serialization should round-trip samples with compatible types", function () {
    for (const testEntries of [sampleEntries1, sampleEntries2]) {
      const serialized = podEntriesToSimplifiedJSON(testEntries);
      const deserialized = podEntriesFromSimplifiedJSON(serialized);

      // It's valid to shift cryptographic -> int for small values.  Check
      // that those cases are valid, then manually fix them.
      for (const [name, orgValue] of Object.entries(testEntries)) {
        if (
          orgValue.type === "cryptographic" &&
          orgValue.value <= POD_INT_MAX
        ) {
          const newValue = (deserialized as Record<PODName, PODValue>)[name];
          expect(newValue.type).to.eq("int");
          newValue.type = "cryptographic";
        }
      }

      expect(deserialized).to.not.eq(testEntries);
      expect(deserialized).to.deep.eq(testEntries);
    }
  });

  it("Simplified serialization of string-encoded types should work as expected", function () {
    for (const { type, value, expectedSerialisedValue } of [
      [
        EDDSA_PUBKEY_TYPE_STRING,
        "f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585",
        `${EDDSA_PUBKEY_TYPE_STRING}:f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585`
      ],
      ["string", "hello", "hello"],
      ["string", ":keyword", ":keyword"],
      ["string", "!!:hello", "!!:hello"],
      ["string", "blah:blah", "string:blah:blah"],
      ["string", "blah:blah:blah:blah", "string:blah:blah:blah:blah"]
    ].map((triple) => {
      return {
        type: triple[0] as POD_VALUE_STRING_TYPE_IDENTIFIER,
        value: triple[1],
        expectedSerialisedValue: triple[2]
      };
    })) {
      const serialisedValue = podValueToRawValue({ type, value });
      expect(serialisedValue).to.eq(expectedSerialisedValue);
      expect(podValueFromRawValue(serialisedValue)).to.deep.eq({ type, value });
    }
  });

  it("Simplified deserialization of string-encoded types should reject invalid inputs", function () {
    expect(() => podValueFromRawValue("strang:hello")).to.throw(Error);
    expect(() => podValueFromRawValue("strin:hello")).to.throw(Error);
    expect(() =>
      podValueFromRawValue(
        "pk:f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f"
      )
    ).to.throw(Error);
  });
});
