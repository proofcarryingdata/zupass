import { expect } from "chai";
import "mocha";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODName,
  PODValue,
  cloneOptionalPODValue,
  clonePODEntries,
  clonePODValue,
  getPODValueForCircuit,
  getRequiredPODValueForCircuit
} from "../src";
import { sampleEntries1, sampleEntries2 } from "./common";

describe("podUtil value helpers should work", async function () {
  it("getPODValueForCircuit should work", function () {
    expect(getPODValueForCircuit({ type: "string", value: "foo" })).to.be
      .undefined;
    expect(
      getPODValueForCircuit({ type: "bytes", value: new Uint8Array([1, 2, 3]) })
    ).to.be.undefined;
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
    expect(getPODValueForCircuit({ type: "boolean", value: true })).to.eq(1n);
    expect(
      getPODValueForCircuit({ type: "date", value: new Date(Date.UTC(2024)) })
    ).to.eq(BigInt(Date.UTC(2024)));
    expect(getPODValueForCircuit({ type: "null", value: null })).to.be
      .undefined;
    expect(() =>
      getPODValueForCircuit({
        type: "something",
        value: 123n
      } as unknown as PODValue)
    ).to.throw(TypeError);
  });

  it("getRequiredPODValueForCircuit should work", function () {
    expect(() =>
      getRequiredPODValueForCircuit({ type: "string", value: "foo" })
    ).to.throw(TypeError);
    expect(() =>
      getRequiredPODValueForCircuit({
        type: "bytes",
        value: new Uint8Array([1, 2, 3])
      })
    ).to.throw(TypeError);
    expect(() =>
      getRequiredPODValueForCircuit({
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      })
    ).to.throw(TypeError);
    expect(getRequiredPODValueForCircuit({ type: "int", value: 123n })).to.eq(
      123n
    );
    expect(
      getRequiredPODValueForCircuit({ type: "cryptographic", value: 0xffffn })
    ).to.eq(0xffffn);
    expect(
      getRequiredPODValueForCircuit({ type: "boolean", value: true })
    ).to.eq(1n);
    expect(
      getRequiredPODValueForCircuit({
        type: "date",
        value: new Date(Date.UTC(2024))
      })
    ).to.eq(BigInt(Date.UTC(2024)));
    expect(() =>
      getRequiredPODValueForCircuit({ type: "null", value: null })
    ).to.throw(TypeError);
    expect(() =>
      getRequiredPODValueForCircuit({
        type: "something",
        value: 123n
      } as unknown as PODValue)
    ).to.throw(TypeError);
  });

  it("clonePODValue should return a new object", function () {
    const testCases = [
      { type: "string", value: "hello" },
      { type: "bytes", value: new Uint8Array([1, 2, 3]) },
      { type: "cryptographic", value: 0n },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      },
      { type: "int", value: 123n },
      { type: "boolean", value: true },
      { type: "date", value: new Date(Date.UTC(2024)) },
      { type: "null", value: null }
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
      { type: "bytes", value: new Uint8Array([1, 2, 3]) },
      { type: "cryptographic", value: 0n },
      {
        type: EDDSA_PUBKEY_TYPE_STRING,
        value:
          "c2478aa919f5d09a68fe264d9e980b94872d2472cb53f514bfc1b19f3029741f"
      },
      { type: "int", value: 123n },
      { type: "boolean", value: true },
      { type: "date", value: new Date(Date.UTC(2024)) },
      { type: "null", value: null }
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
