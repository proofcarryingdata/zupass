import {
  POD,
  PODEdDSAPublicKeyValue,
  PODName,
  PODValue,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import {
  GPCProofEntryBoundsCheckConfig,
  GPCProofEntryConfig,
  GPCProofEntryInequalityConfig,
  PODEntryIdentifier
} from "../src";
import {
  checkProofBoundsCheckConfigForEntryInequalityConfig,
  checkProofBoundsCheckInputsForConfig,
  checkProofEntryBoundsCheckConfig,
  checkProofEntryConfig,
  checkProofEntryInequalityInputsForConfig,
  checkProofPODUniquenessInputsForConfig
} from "../src/gpcChecks";
import { privateKey, sampleEntries, sampleEntries2 } from "./common";

describe("Proof entry config check should work", () => {
  it("should pass for a minimal entry configuration", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig = { isRevealed: false };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasOwnerV3Check: false,
      hasOwnerV4Check: false,
      inequalityChecks: {},
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
      equalsEntry: "someOtherPOD.someOtherEntry",
      lessThan: "someOtherPOD.anotherEntry"
    };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasOwnerV3Check: false,
      hasOwnerV4Check: false,
      inequalityChecks: { lessThan: "someOtherPOD.anotherEntry" },
      nBoundsChecks: 2
    });
  });

  it("should pass for an entry configuration with a Semaphore V3 owner identity commitment", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig: GPCProofEntryConfig = {
      isRevealed: false,
      isOwnerID: "SemaphoreV3"
    };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasOwnerV3Check: true,
      hasOwnerV4Check: false,
      inequalityChecks: {},
      nBoundsChecks: 0
    });
  });

  it("should pass for an entry configuration with a Semaphore V4 owner identity commitment", () => {
    const entryName = "somePOD.someEntry";
    const entryConfig: GPCProofEntryConfig = {
      isRevealed: false,
      isOwnerID: "SemaphoreV4"
    };
    expect(checkProofEntryConfig(entryName, entryConfig)).to.deep.equal({
      hasOwnerV3Check: false,
      hasOwnerV4Check: true,
      inequalityChecks: {},
      nBoundsChecks: 0
    });
  });
});

// TODO(POD-P4): Test other aspects of this check

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
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig, false)
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
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig, false)
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
        checkProofEntryBoundsCheckConfig(entryName, boundsCheckConfig, false)
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

describe("Proof config check against input for POD uniqueness should work", () => {
  const pod1 = POD.sign(sampleEntries, privateKey);
  const pod2 = POD.sign(sampleEntries2, privateKey);
  const pod3 = POD.sign({ A: sampleEntries.A }, privateKey);
  const pod4 = POD.sign({ E: sampleEntries.E }, privateKey);

  const uniquePODInputs = [
    { pod1 },
    { pod1, pod2 },
    { pod1, pod2, pod3 },
    { pod1, pod2, pod3, pod4 }
  ] as Record<PODName, POD>[];

  const nonuniquePODInputs = [
    { pod1, pod2: pod1 },
    { pod1, pod2, pod3: pod1 },
    { pod2, pod1, pod3: pod1 },
    { pod1, pod2, pod3, pod4: pod1 },
    { pod2, pod3, pod1, pod4: pod1 }
  ] as Record<PODName, POD>[];

  it("should pass if disabled", () => {
    for (const pods of uniquePODInputs.concat(nonuniquePODInputs)) {
      for (const config of [{}, { uniquePODs: false }]) {
        expect(() => checkProofPODUniquenessInputsForConfig(config, { pods }))
          .to.not.throw;
      }
    }
  });

  it("should pass for unique POD inputs", () => {
    for (const pods of uniquePODInputs) {
      expect(() =>
        checkProofPODUniquenessInputsForConfig({ uniquePODs: true }, { pods })
      ).to.not.throw;
    }
  });

  it("should throw for non-unique POD inputs if enabled", () => {
    for (const pods of nonuniquePODInputs) {
      expect(() =>
        checkProofPODUniquenessInputsForConfig({ uniquePODs: true }, { pods })
      ).to.throw;
    }
  });
});

describe("Proof entry inequality config check against bounds check config should work", () => {
  const boundsChecks = {
    "pod1.a": 1,
    "pod2.someEntry": 2,
    "pod2.someOtherEntry": 1,
    "pod3.entry": 1,
    "pod4.a": 2,
    "pod4.b": 1
  };
  it("should pass for no entry inequalities", () => {
    // Without bounds checks
    expect(() => checkProofBoundsCheckConfigForEntryInequalityConfig({}, {})).to
      .not.throw;
    // With bounds checks
    expect(() =>
      checkProofBoundsCheckConfigForEntryInequalityConfig(boundsChecks, {})
    ).to.not.throw;
  });
  it("should pass for entry inequalities with corresponding bounds checks", () => {
    const entryInequalityCheckCombos: Record<
      PODEntryIdentifier,
      GPCProofEntryInequalityConfig
    >[] = [
      { "pod1.a": { greaterThan: "pod3.entry" } },
      {
        "pod1.a": { greaterThan: "pod3.entry" },
        "pod3.entry": { lessThanEq: "pod4.b" }
      },
      {
        "pod1.a": { greaterThan: "pod2.someEntry" },
        "pod2.someEntry": { lessThanEq: "pod1.a" },
        "pod2.someOtherEntry": { greaterThanEq: "pod3.entry" },
        "pod3.entry": { lessThanEq: "pod2.someEntry" }
      },
      {
        "pod1.a": { lessThan: "pod4.a", greaterThan: "pod2.someEntry" },
        "pod2.someEntry": { lessThanEq: "pod1.a" },
        "pod2.someOtherEntry": {
          lessThan: "pod4.b",
          greaterThan: "pod4.a",
          greaterThanEq: "pod3.entry"
        },
        "pod3.entry": {
          lessThan: "pod4.b",
          greaterThan: "pod4.a",
          greaterThanEq: "pod1.a",
          lessThanEq: "pod2.someEntry"
        }
      }
    ];
    for (const entryInequalityChecks of entryInequalityCheckCombos) {
      expect(() =>
        checkProofBoundsCheckConfigForEntryInequalityConfig(
          boundsChecks,
          entryInequalityChecks
        )
      ).to.not.throw;
    }
  });
  it("should throw for entry inequalities without corresponding bounds checks", () => {
    const entryInequalityCheckCombos: Record<
      PODEntryIdentifier,
      GPCProofEntryInequalityConfig
    >[] = [
      { "pod1.a": { greaterThan: "pod3.entre" } },
      {
        "pod1.a": { greaterThan: "pod3.entry" },
        "pod3.entry": { lessThanEq: "pod4.bee" }
      },
      {
        "pod1.a": { greaterThan: "pod2.someEntry" },
        "pod2.someEntry": { lessThanEq: "pod1.ay" },
        "pod2.someOtherEntry": { greaterThanEq: "pod3.entry" },
        "pod3.entry": { lessThanEq: "pod2.someEntry" }
      },
      {
        "pod1.a": { lessThan: "pod4.a", greaterThan: "pod2.someEntry" },
        "pod2.someEntry": { lessThanEq: "pod1.a" },
        "pod2.someOtherEntry": {
          lessThan: "pod4.b",
          greaterThan: "pod4.a",
          greaterThanEq: "pod3.entry"
        },
        "pod3.entry": {
          lessThan: "pod4.b",
          greaterThan: "pod4.ay",
          greaterThanEq: "pod1.a",
          lessThanEq: "pod2.someEntre"
        }
      }
    ];
    for (const entryInequalityChecks of entryInequalityCheckCombos) {
      expect(() =>
        checkProofBoundsCheckConfigForEntryInequalityConfig(
          boundsChecks,
          entryInequalityChecks
        )
      ).to.throw;
    }
  });
});

describe("Proof entry inequality config check against inputs should work", () => {
  const pod1 = POD.sign(sampleEntries, privateKey);
  const pod2 = pod1;
  const pods = { pod1, pod2 };
  it("should pass for no entry inequality check", () => {
    expect(() =>
      checkProofEntryInequalityInputsForConfig(
        "pod1.A",
        {},
        { type: "int", value: 123n },
        pods
      )
    ).to.not.throw;
  });
  it("should pass for simple inequality checks with valid input", () => {
    const entryInequalityConfigs: GPCProofEntryInequalityConfig[] = [
      { lessThan: "pod1.B" },
      { greaterThan: "pod1.G" },
      { lessThanEq: "pod2.A" },
      { greaterThanEq: "pod1.H" }
    ];
    for (const entryInequalityConfig of entryInequalityConfigs) {
      expect(() =>
        checkProofEntryInequalityInputsForConfig(
          "pod2.A",
          entryInequalityConfig,
          { type: "int", value: 123n },
          pods
        )
      ).to.not.throw;
    }
  });
  it("should pass for more complex inequality checks with valid input", () => {
    const entryInequalityConfigs: GPCProofEntryInequalityConfig[] = [
      { lessThan: "pod1.B", greaterThan: "pod1.G" },
      { lessThan: "pod1.B", greaterThan: "pod1.G", lessThanEq: "pod2.A" },
      {
        lessThan: "pod1.B",
        greaterThan: "pod1.G",
        lessThanEq: "pod2.A",
        greaterThanEq: "pod1.H"
      }
    ];
    for (const entryInequalityConfig of entryInequalityConfigs) {
      expect(() =>
        checkProofEntryInequalityInputsForConfig(
          "pod2.A",
          entryInequalityConfig,
          { type: "int", value: 123n },
          pods
        )
      ).to.not.throw;
    }
  });
  it("should throw for inequality checks with invalid input", () => {
    const entryInequalityConfigs: GPCProofEntryInequalityConfig[] = [
      { lessThan: "pod1.G" },
      { lessThan: "pod1.B", greaterThan: "pod2.B" },
      { greaterThan: "pod1.H", lessThanEq: "pod2.K" },
      { greaterThan: "pod1.H", greaterThanEq: "pod1.B" }
    ];
    for (const entryInequalityConfig of entryInequalityConfigs) {
      expect(() =>
        checkProofEntryInequalityInputsForConfig(
          "pod2.A",
          entryInequalityConfig,
          { type: "int", value: 123n },
          pods
        )
      ).to.throw;
    }
  });
});

// TODO(POD-P4): More tests
