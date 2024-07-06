import {
  PODEdDSAPublicKeyValue,
  PODValue,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { GPCProofEntryConfig } from "../src";
import {
  checkProofBoundsCheckInputsForConfig,
  checkProofEntryConfig
} from "../src/gpcChecks";

describe("Proof entry config check should work", () => {
  it("should pass for a minimal entry configuration", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig = { isRevealed: false };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasBoundsCheck: false
    });
  });

  it("should pass for a typical entry configuration", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig: GPCProofEntryConfig = {
      isRevealed: false,
      isMemberOf: "someList",
      inRange: { min: 0n, max: 10n },
      equalsEntry: "someOtherPOD.someOtherEntry"
    };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasBoundsCheck: true
    });
  });

  // TODO(POD-P3): Test other aspects of this check

  it("should pass for an entry configuration with bounds checks within the appropriate range", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 3n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 100n } },
      { inRange: { min: 3n, max: 100n } }
    ]) {
      const entryName = "somePOD.someEntry";
      const entryConfig = { isRevealed: false };
      expect(
        checkProofEntryConfig(entryName, {
          ...entryConfig,
          ...boundsCheckConfig
        })
      ).to.deep.equal({ hasBoundsCheck: true });
    }
  });

  it("should fail for an entry configuration with bounds checks outside of the appropriate range", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: POD_INT_MIN - 1n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: POD_INT_MAX + 1n } },
      { inRange: { min: POD_INT_MIN - 1n, max: 100n } },
      { inRange: { min: 3n, max: POD_INT_MAX + 1n } },
      { inRange: { min: POD_INT_MIN, max: POD_INT_MAX + 1n } }
    ]) {
      const entryName = "somePOD.someEntry";
      const entryConfig = { isRevealed: false };
      expect(() =>
        checkProofEntryConfig(entryName, {
          ...entryConfig,
          ...boundsCheckConfig
        })
      ).to.throw(RangeError);
    }
  });
});

describe("Proof config check against input for bounds checks should work", () => {
  it("should pass for an entry configuration without bounds checks", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig = { isRevealed: true };
    const entryValue: PODValue = { type: "string", value: "hello" };
    expect(
      checkProofBoundsCheckInputsForConfig(entryName, entryConfig, entryValue)
    ).to.not.throw;
  });
  it("should pass for an entry configuration containing bounds checks", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 3n, max: POD_INT_MAX } },
      { inRange: { min: 25n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 25n } },
      { inRange: { min: POD_INT_MIN, max: 100n } },
      { inRange: { min: 25n, max: 25n } },
      { inRange: { min: 3n, max: 100n } }
    ]) {
      const entryName = "somePOD.someEntry";
      const entryConfig = { isRevealed: false };
      const entryValue: PODValue = { type: "int", value: 25n };
      expect(
        checkProofBoundsCheckInputsForConfig(
          entryName,
          { ...entryConfig, ...boundsCheckConfig },
          entryValue
        )
      ).to.not.throw;
    }
  });
  it("should fail for an entry not satisfying bounds", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 38n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: 20n } },
      { inRange: { min: 3n, max: 24n } },
      { inRange: { min: 26n, max: 100n } }
    ]) {
      const entryName = "somePOD.someEntry";
      const entryConfig = { isRevealed: false };
      const entryValue: PODValue = { type: "int", value: 25n };
      expect(() =>
        checkProofBoundsCheckInputsForConfig(
          entryName,
          { ...entryConfig, ...boundsCheckConfig },
          entryValue
        )
      ).to.throw(RangeError);
    }
  });
  it("should fail for a non-int entry configuration containing bounds checks", () => {
    for (const entryValue of [
      PODEdDSAPublicKeyValue("xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"),
      { type: "cryptographic", value: 25n } satisfies PODValue,
      { type: "string", value: "hello" } satisfies PODValue
    ]) {
      for (const boundsCheckConfig of [
        { inRange: { min: 3n, max: POD_INT_MAX } },
        { inRange: { min: POD_INT_MIN, max: 100n } },
        { inRange: { min: 3n, max: 100n } }
      ]) {
        const entryName = "somePOD.someEntry";
        const entryConfig = { isRevealed: false };
        expect(() =>
          checkProofBoundsCheckInputsForConfig(
            entryName,
            { ...entryConfig, ...boundsCheckConfig },
            entryValue
          )
        ).to.throw(TypeError);
      }
    }
  });
});
// TODO(POD-P3): More tests
