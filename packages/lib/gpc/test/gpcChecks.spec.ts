import {
  PODEdDSAPublicKeyValue,
  PODValue,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { GPCProofEntryBoundsCheckConfig, GPCProofEntryConfig } from "../src";
import {
  checkProofBoundsCheckInputsForConfig,
  checkProofEntryBoundsCheckConfig,
  checkProofEntryConfig
} from "../src/gpcChecks";

describe("Proof entry config check should work", () => {
  it("should pass for a minimal entry configuration", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig = { isRevealed: false };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      nBoundsChecks: 0
    });
  });

  it("should pass for a typical entry configuration", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig: GPCProofEntryConfig = {
      isRevealed: false,
      isMemberOf: "someList",
      inRange: { min: 0n, max: 100n },
      notInRange: { min: 10n, max: 30n },
      equalsEntry: "someOtherPOD.someOtherEntry"
    };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      nBoundsChecks: 2
    });
  });
});

// TODO(POD-P3): Test other aspects of this check

describe("Entry bounds check config check should work", () => {
  it("should pass for bounds checks within the appropriate range", () => {
    for (const [boundsCheckConfig, nBoundsChecks] of [
      [{ inRange: { min: 3n, max: POD_INT_MAX } }, 1],
      [{ notInRange: { min: POD_INT_MIN, max: 100n } }, 1],
      [
        {
          inRange: { min: 3n, max: 100n },
          notInRange: { min: 204n, max: 900n }
        },
        1
      ],
      [
        {
          inRange: { min: -1000n, max: 1000n },
          notInRange: { min: 0n, max: 10n }
        },
        2
      ],
      [
        {
          inRange: { min: 0n, max: 10n },
          notInRange: { min: 5n, max: 100n }
        },
        1
      ],
      [
        {
          inRange: { min: 0n, max: 10n },
          notInRange: { min: 5n, max: 100n }
        },
        1
      ],
      [
        {
          inRange: { min: 0n, max: 10n },
          notInRange: { min: -5n, max: 5n }
        },
        1
      ]
    ] satisfies [GPCProofEntryBoundsCheckConfig, number][]) {
      const entryName = "somePOD.someEntry";
      expect(
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig)
      ).to.equal(nBoundsChecks);
    }
  });

  it("should fail for bounds checks outside of the appropriate range", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: POD_INT_MIN - 1n, max: POD_INT_MAX } },
      { inRange: { min: POD_INT_MIN, max: POD_INT_MAX + 1n } },
      { notInRange: { min: POD_INT_MIN - 1n, max: POD_INT_MAX } },
      { notInRange: { min: POD_INT_MIN, max: POD_INT_MAX + 1n } },
      {
        inRange: { min: POD_INT_MIN - 1n, max: 100n },
        notInRange: { min: 0n, max: 50n }
      },
      {
        notInRange: { min: 10n, max: 55n },
        inRange: { min: 3n, max: POD_INT_MAX + 1n }
      }
    ]) {
      const entryName = "somePOD.someEntry";
      expect(() =>
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig)
      ).to.throw(RangeError);
    }
  });

  it("should fail for incompatible bounds checks", () => {
    for (const boundsCheckConfig of [
      { inRange: { min: 0n, max: 10n }, notInRange: { min: 0n, max: 10n } },
      {
        inRange: { min: -50n, max: 0n },
        notInRange: { min: POD_INT_MIN, max: 100n }
      },
      {
        inRange: { min: -100n, max: 100n },
        notInRange: { min: POD_INT_MIN, max: POD_INT_MAX }
      }
    ]) {
      const entryName = "somePOD.someEntry";
      expect(() =>
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig)
      ).to.throw(Error);
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
      { inRange: { min: 3n, max: 100n } },
      { notInRange: { min: 26n, max: POD_INT_MAX } },
      { notInRange: { min: POD_INT_MIN, max: 24n } },
      { inRange: { min: 0n, max: 100n }, notInRange: { min: 26n, max: 40n } },
      { inRange: { min: 0n, max: 100n }, notInRange: { min: 5n, max: 24n } }
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
      { inRange: { min: 26n, max: 100n } },
      { notInRange: { min: 25n, max: 25n } },
      { notInRange: { min: POD_INT_MIN, max: 30n } },
      { notInRange: { min: 24n, max: POD_INT_MAX } },
      { inRange: { min: 0n, max: 100n }, notInRange: { min: 24n, max: 26n } }
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
        { inRange: { min: 3n, max: 100n } },
        { notInRange: { min: 3n, max: POD_INT_MAX } },
        { notInRange: { min: POD_INT_MIN, max: 100n } },
        { notInRange: { min: 3n, max: 100n } },
        { inRange: { min: 0n, max: 100n }, notInRange: { min: 26n, max: 40n } }
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
