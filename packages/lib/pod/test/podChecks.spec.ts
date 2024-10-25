import { expect } from "chai";
import "mocha";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODValue,
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkBigintBounds,
  checkPODName,
  checkPODValue,
  checkPrivateKeyFormat,
  checkPublicKeyFormat,
  checkSignatureFormat,
  isPODNumericValue,
  requireValueType
} from "../src";
import {
  expectedPublicKey,
  expectedPublicKeyHex,
  expectedSignature1,
  expectedSignature1Hex,
  expectedSignature2,
  expectedSignature2Hex,
  privateKey,
  sampleEntries1,
  sampleEntries2,
  testPrivateKeysAllFormats
} from "./common";

describe("podChecks input checkers should work", async function () {
  it("checkPrivateKeyFormat should accept valid inputs", function () {
    for (const testPrivateKey of testPrivateKeysAllFormats) {
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
      Buffer.from(privateKey, "base64") as unknown as string,
      "=V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs",
      "V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs====="
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
      expectedPublicKeyHex,
      ...testPrivateKeysAllFormats
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
      Buffer.from(expectedPublicKey, "base64") as unknown as string,
      "=V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs",
      "V5QnFjAO3EQu7inyDWcdx7wSo1h88Lh5qPUGHjgxbrs====="
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
      expectedSignature1Hex,
      expectedSignature2Hex,
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
      Buffer.from(privateKey, "hex") as unknown as string,
      "=ZKuvJhYh4JXNqKqt1uS99lAVReh_bNkjv35eD3KVAysBOOyAM1BjmwoE3pwm_CuCMvP0a1t0hraeAsTeBjmGAQ",
      "ZKuvJhYh4JXNqKqt1uS99lAVReh_bNkjv35eD3KVAysBOOyAM1BjmwoE3pwm_CuCMvP0a1t0hraeAsTeBjmGAQ======"
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
      ["hello", "string"],
      [{}, "object"],
      [{ abc: 123 }, "object"],
      [new Uint8Array([1, 2, 3]), "object"],
      [new Date(Date.UTC(2024)), "object"],
      [[], "array"],
      [[1, 2, 3, "abc"], "array"],
      [null, "null"]
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
      [undefined, "string"],
      [{}, "array"],
      [{ abc: 123 }, "array"],
      [new Uint8Array([1, 2, 3]), "array"],
      [new Date(Date.UTC(2024)), "null"],
      [null, "array"],
      [[], "object"],
      [[1, 2, 3, "abc"], "object"],
      [null, "object"]
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
      expect(fn).to.throw(RangeError, "valueName");
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
        type: "bytes",
        value: new Uint8Array([])
      },
      {
        type: "bytes",
        value: new Uint8Array([1, 2, 3])
      },
      {
        type: "bytes",
        value: Buffer.from(
          "no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_no_size_limit_"
        )
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
      { type: "boolean", value: true },
      { type: "boolean", value: false },
      { type: "int", value: -1n },
      { type: "int", value: 0n },
      { type: "int", value: 123n },
      { type: "int", value: POD_INT_MIN },
      { type: "int", value: POD_INT_MAX },
      { type: "date", value: new Date(Date.UTC(2024)) },
      { type: "date", value: POD_DATE_MIN },
      { type: "date", value: POD_DATE_MAX },
      { type: "null", value: null }
    ] as (undefined | PODValue)[];
    for (const testInput of testCases) {
      const checked = checkPODValue("valueName", testInput);
      expect(checked).to.eq(testInput);
    }
  });

  it("checkPODValue should reject invalid inputs", function () {
    const testCases = [
      [undefined as unknown as PODValue, TypeError],
      [{}, TypeError],
      [{ type: "int" }, TypeError],
      [{ value: 0n }, TypeError],
      [{ type: undefined, value: 0n }, TypeError],
      [{ type: "string", value: undefined }, TypeError],
      [{ type: "string", value: null }, TypeError],
      [{ type: "something", value: 0n }, TypeError],
      [{ type: "bigint", value: 0n }, TypeError],
      [{ type: "something", value: "something" }, TypeError],
      [{ type: "string", value: 0n }, TypeError],
      [{ type: "string", value: 123 }, TypeError],
      [{ type: "string", value: new Uint8Array([1, 2, 3]) }, TypeError],
      [{ type: "bytes", value: new Uint16Array([1, 2, 3]) }, TypeError],
      [{ type: "bytes", value: "hello" }, TypeError],
      [{ type: "bytes", value: true }, TypeError],
      [{ type: "string", value: Buffer.from("hello") }, TypeError],
      [{ type: EDDSA_PUBKEY_TYPE_STRING, value: "hello" }, TypeError],
      [{ type: EDDSA_PUBKEY_TYPE_STRING, value: "0" }, TypeError],
      [{ type: EDDSA_PUBKEY_TYPE_STRING, value: 0n }, TypeError],
      [{ type: "cryptographic", value: "hello" }, TypeError],
      [{ type: "cryptographic", value: 123 }, TypeError],
      [{ type: "cryptographic", value: -1n }, RangeError],
      [
        { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MIN - 1n },
        RangeError
      ],
      [
        { type: "cryptographic", value: POD_CRYPTOGRAPHIC_MAX + 1n },
        RangeError
      ],
      [{ type: "int", value: "hello" }, TypeError],
      [{ type: "int", value: 123 }, TypeError],
      [{ type: "int", value: POD_INT_MIN - 1n }, RangeError],
      [{ type: "int", value: POD_INT_MAX + 1n }, RangeError],
      [{ type: "boolean", value: 123 }, TypeError],
      [{ type: "date", value: 12345 }, TypeError],
      [{ type: "date", value: { year: 2024 } }, TypeError],
      [{ type: "null", value: 1n }, TypeError]
    ] as [PODValue, ErrorConstructor][];
    for (const [testInput, expectedError] of testCases) {
      const fn = (): void => {
        checkPODValue("valueName", testInput);
      };
      expect(fn).to.throw(expectedError, "valueName");
    }
  });
});

describe("podChecks value helpers should work", async function () {
  it("isPODNumericValue should work", function () {
    expect(isPODNumericValue({ type: "string", value: "foo" })).to.be.false;
    expect(isPODNumericValue({ type: "bytes", value: Buffer.from("foo") })).to
      .be.false;
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
    expect(isPODNumericValue({ type: "boolean", value: true })).to.be.true;
    expect(isPODNumericValue({ type: "date", value: new Date(Date.UTC(2024)) }))
      .to.be.true;
    expect(
      isPODNumericValue({
        type: "something",
        value: 123n
      } as unknown as PODValue)
    ).to.be.false;
  });
});
