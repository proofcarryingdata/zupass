import {
  CircuitSignal,
  array2Bits,
  extendedSignalArray
} from "@pcd/gpcircuits";
import { PODValue, POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import {
  BABY_JUB_NEGATIVE_ONE,
  BABY_JUB_SUBGROUP_ORDER_MINUS_ONE
} from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { GPCProofEntryConfig, PODEntryIdentifier } from "../src";
import {
  compileCommonEntryInequalities,
  compileProofOwnerV3,
  compileProofOwnerV4,
  compileProofPODUniqueness,
  compileVerifyOwnerV3,
  compileVerifyOwnerV4
} from "../src/gpcCompile";
import {
  GPCProofEntryNumericValueConfig,
  GPCProofNumericValueConfig,
  makeWatermarkSignal
} from "../src/gpcUtil";
import { ownerIdentity, ownerIdentityV4 } from "./common";

describe("Semaphore V3 owner module compilation for proving should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    for (const paramIncludeOwnerV3 of [true, false]) {
      const circuitOwnerV3Inputs = compileProofOwnerV3(
        undefined,
        undefined,
        paramIncludeOwnerV3
      );
      expect(circuitOwnerV3Inputs).to.deep.eq({
        ownerV3EntryIndex: paramIncludeOwnerV3 ? [BABY_JUB_NEGATIVE_ONE] : [],
        ownerSemaphoreV3IdentityNullifier: paramIncludeOwnerV3
          ? [BABY_JUB_NEGATIVE_ONE]
          : [],
        ownerSemaphoreV3IdentityTrapdoor: paramIncludeOwnerV3
          ? [BABY_JUB_NEGATIVE_ONE]
          : [],
        ownerV3IsNullifierHashRevealed: paramIncludeOwnerV3 ? [0n] : []
      });
    }
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const circuitOwnerV3Inputs = compileProofOwnerV3(
          {
            semaphoreV3: ownerIdentity,
            ...(externalNullifier ? { externalNullifier } : {})
          },
          firstOwnerIndex,
          true
        );
        expect(circuitOwnerV3Inputs).to.deep.eq({
          ownerV3EntryIndex: [BigInt(firstOwnerIndex)],
          ownerSemaphoreV3IdentityNullifier: [ownerIdentity.nullifier],
          ownerSemaphoreV3IdentityTrapdoor: [ownerIdentity.trapdoor],
          ownerV3IsNullifierHashRevealed: [
            BigInt(externalNullifier !== undefined)
          ]
        });
      }
    }
  });
  it("should throw for a proof with an owner entry without the necessary input", () => {
    const delayedCircuitOwnerInputs = (): {
      ownerV3EntryIndex: CircuitSignal[];
      ownerSemaphoreV3IdentityNullifier: CircuitSignal[];
      ownerSemaphoreV3IdentityTrapdoor: CircuitSignal[];
      ownerV3IsNullifierHashRevealed: CircuitSignal[];
    } => compileProofOwnerV3(undefined, 3, true);
    expect(delayedCircuitOwnerInputs).to.throw;
  });
});
describe("Semaphore V3 owner module compilation for verification should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    for (const paramIncludeOwnerV3 of [true, false]) {
      const { circuitOwnerV3Inputs, circuitOwnerV3Outputs } =
        compileVerifyOwnerV3(undefined, undefined, paramIncludeOwnerV3);
      expect(circuitOwnerV3Inputs).to.deep.eq({
        ownerV3EntryIndex: paramIncludeOwnerV3 ? [BABY_JUB_NEGATIVE_ONE] : [],
        ownerV3IsNullifierHashRevealed: paramIncludeOwnerV3 ? [0n] : []
      });
      expect(circuitOwnerV3Outputs).to.deep.eq({
        ownerV3RevealedNullifierHash: paramIncludeOwnerV3
          ? [BABY_JUB_NEGATIVE_ONE]
          : []
      });
    }
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const nullifierHashV3 = externalNullifier
          ? poseidon2([
              makeWatermarkSignal(externalNullifier),
              ownerIdentity.nullifier
            ])
          : BABY_JUB_NEGATIVE_ONE;
        const { circuitOwnerV3Inputs, circuitOwnerV3Outputs } =
          compileVerifyOwnerV3(
            externalNullifier
              ? {
                  externalNullifier,
                  nullifierHashV3
                }
              : undefined,
            firstOwnerIndex,
            true
          );
        expect(circuitOwnerV3Inputs).to.deep.eq({
          ownerV3EntryIndex: [BigInt(firstOwnerIndex)],
          ownerV3IsNullifierHashRevealed: [
            BigInt(externalNullifier !== undefined)
          ]
        });
        expect(circuitOwnerV3Outputs).to.deep.eq({
          ownerV3RevealedNullifierHash: [nullifierHashV3]
        });
      }
    }
  });
});
describe("Semaphore V4 owner module compilation for proving should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    for (const paramIncludeOwnerV4 of [true, false]) {
      const circuitOwnerV4Inputs = compileProofOwnerV4(
        undefined,
        undefined,
        paramIncludeOwnerV4
      );
      expect(circuitOwnerV4Inputs).to.deep.eq({
        ownerV4EntryIndex: paramIncludeOwnerV4 ? [BABY_JUB_NEGATIVE_ONE] : [],
        ownerSemaphoreV4SecretScalar: paramIncludeOwnerV4
          ? [BABY_JUB_SUBGROUP_ORDER_MINUS_ONE]
          : [],
        ownerV4IsNullifierHashRevealed: paramIncludeOwnerV4 ? [0n] : []
      });
    }
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const circuitOwnerV4Inputs = compileProofOwnerV4(
          {
            semaphoreV4: ownerIdentityV4,
            ...(externalNullifier ? { externalNullifier } : {})
          },
          firstOwnerIndex,
          true
        );
        expect(circuitOwnerV4Inputs).to.deep.eq({
          ownerV4EntryIndex: [BigInt(firstOwnerIndex)],
          ownerSemaphoreV4SecretScalar: [ownerIdentityV4.secretScalar],
          ownerV4IsNullifierHashRevealed: [
            BigInt(externalNullifier !== undefined)
          ]
        });
      }
    }
  });
  it("should throw for a proof with an owner entry without the necessary input", () => {
    const delayedCircuitOwnerInputs = (): {
      ownerV4EntryIndex: CircuitSignal[];
      ownerSemaphoreV4SecretScalar: CircuitSignal[];
      ownerV4IsNullifierHashRevealed: CircuitSignal[];
    } => compileProofOwnerV4(undefined, 3, true);
    expect(delayedCircuitOwnerInputs).to.throw;
  });
});
describe("Semaphore V4 owner module compilation for verification should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    for (const paramIncludeOwnerV4 of [true, false]) {
      const { circuitOwnerV4Inputs, circuitOwnerV4Outputs } =
        compileVerifyOwnerV4(undefined, undefined, paramIncludeOwnerV4);
      expect(circuitOwnerV4Inputs).to.deep.eq({
        ownerV4EntryIndex: paramIncludeOwnerV4 ? [BABY_JUB_NEGATIVE_ONE] : [],
        ownerV4IsNullifierHashRevealed: paramIncludeOwnerV4 ? [0n] : []
      });
      expect(circuitOwnerV4Outputs).to.deep.eq({
        ownerV4RevealedNullifierHash: paramIncludeOwnerV4
          ? [BABY_JUB_NEGATIVE_ONE]
          : []
      });
    }
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const nullifierHashV4 = externalNullifier
          ? poseidon2([
              makeWatermarkSignal(externalNullifier),
              ownerIdentityV4.secretScalar
            ])
          : BABY_JUB_NEGATIVE_ONE;
        const { circuitOwnerV4Inputs, circuitOwnerV4Outputs } =
          compileVerifyOwnerV4(
            externalNullifier
              ? {
                  externalNullifier,
                  nullifierHashV4
                }
              : undefined,
            firstOwnerIndex,
            true
          );
        expect(circuitOwnerV4Inputs).to.deep.eq({
          ownerV4EntryIndex: [BigInt(firstOwnerIndex)],
          ownerV4IsNullifierHashRevealed: [
            BigInt(externalNullifier !== undefined)
          ]
        });
        expect(circuitOwnerV4Outputs).to.deep.eq({
          ownerV4RevealedNullifierHash: [nullifierHashV4]
        });
      }
    }
  });
});

describe("POD uniqueness module compilation for proving and verification should work", () => {
  it("should work as expected for a proof configuration with POD uniqueness enabled", () => {
    expect(compileProofPODUniqueness({ uniquePODs: true })).to.deep.equal({
      requireUniqueContentIDs: 1n
    });
  });
  it("should work as expected for a proof configuration with POD uniqueness disabled", () => {
    for (const config of [{}, { uniquePODs: false }]) {
      expect(compileProofPODUniqueness(config)).to.deep.equal({
        requireUniqueContentIDs: 0n
      });
    }
  });
});

describe("POD entry inequality module compilation for proving and verification should work", () => {
  const typicalEntryIdentifiers: PODEntryIdentifier[] = [
    "pod1.a",
    "pod2.someEntry",
    "pod2.someOtherEntry",
    "pod3.entry",
    "pod4.a",
    "pod4.b"
  ];
  const typicalNumericValueConfigTriples = typicalEntryIdentifiers.map(
    (entryId, i) => [
      entryId,
      {
        boundsCheckConfig: { min: POD_INT_MIN, max: POD_INT_MAX },
        index: BigInt(i)
      }
    ]
  ) as [PODEntryIdentifier, GPCProofEntryNumericValueConfig][];
  const typicalNumericValueConfig: GPCProofNumericValueConfig = new Map(
    typicalNumericValueConfigTriples
  );
  const typicalEntryIdConfigPairs: [
    PODEntryIdentifier,
    { entryConfig: GPCProofEntryConfig }
  ][] = typicalEntryIdentifiers.map((entryId) => [
    entryId,
    { entryConfig: { isRevealed: false } }
  ]);
  it("should work as expected for no entry inequality checks", () => {
    for (const paramEntryInequalities of [0, 2, 6]) {
      const numericValueConfig: GPCProofNumericValueConfig = new Map([]);
      const entryMap = new Map(typicalEntryIdConfigPairs);
      const entryIneqSignals = compileCommonEntryInequalities(
        numericValueConfig,
        entryMap,
        paramEntryInequalities
      );
      expect(entryIneqSignals).to.deep.equal({
        entryInequalityValueIndex: extendedSignalArray(
          [],
          paramEntryInequalities,
          0n
        ),
        entryInequalityOtherValueIndex: extendedSignalArray(
          [],
          paramEntryInequalities,
          0n
        ),
        entryInequalityIsLessThan: 0n
      });
    }
  });
  it("should work as expected with <=1 entry inequality check per entry", () => {
    const entryIdConfigPairsWithIneq: [
      PODEntryIdentifier,
      { entryConfig: GPCProofEntryConfig }
    ][] = [
      [
        "pod1.a",
        { entryConfig: { isRevealed: false, greaterThan: "pod2.someEntry" } }
      ],
      [
        "pod2.someEntry",
        { entryConfig: { isRevealed: false, lessThanEq: "pod1.a" } }
      ],
      [
        "pod2.someOtherEntry",
        {
          entryConfig: { isRevealed: false, greaterThanEq: "pod3.entry" }
        }
      ],
      [
        "pod3.entry",
        {
          entryConfig: { isRevealed: false, lessThanEq: "pod2.someEntry" }
        }
      ]
    ];
    for (const paramEntryInequalities of [1, 2, 3, 4, 6]) {
      const entryMap = new Map(
        typicalEntryIdConfigPairs.concat(
          entryIdConfigPairsWithIneq.slice(0, paramEntryInequalities)
        )
      );
      const entryIneqSignals = compileCommonEntryInequalities(
        typicalNumericValueConfig,
        entryMap,
        paramEntryInequalities
      );
      expect(entryIneqSignals).to.deep.eq({
        entryInequalityValueIndex: extendedSignalArray(
          [1n, 0n, 2n, 1n].slice(0, paramEntryInequalities),
          paramEntryInequalities,
          0n
        ),
        entryInequalityOtherValueIndex: extendedSignalArray(
          [0n, 1n, 3n, 3n].slice(0, paramEntryInequalities),
          paramEntryInequalities,
          0n
        ),
        entryInequalityIsLessThan: array2Bits(
          extendedSignalArray(
            [1n, 0n, 0n, 0n].slice(0, paramEntryInequalities),
            paramEntryInequalities,
            0n
          )
        )
      });
    }
  });
  it("should work as expected with more complex entry inequality checks", () => {
    const entryIdConfigPairsWithIneq: [
      PODEntryIdentifier,
      { entryConfig: GPCProofEntryConfig }
    ][] = [
      [
        "pod1.a",
        {
          entryConfig: {
            isRevealed: false,
            lessThan: "pod4.a",
            greaterThan: "pod2.someEntry"
          }
        }
      ],
      [
        "pod2.someEntry",
        { entryConfig: { isRevealed: false, lessThanEq: "pod1.a" } }
      ],
      [
        "pod2.someOtherEntry",
        {
          entryConfig: {
            isRevealed: false,
            lessThan: "pod4.b",
            greaterThan: "pod4.a",
            greaterThanEq: "pod3.entry"
          }
        }
      ],
      [
        "pod3.entry",
        {
          entryConfig: {
            isRevealed: false,
            lessThan: "pod4.b",
            greaterThan: "pod4.a",
            greaterThanEq: "pod1.a",
            lessThanEq: "pod2.someEntry"
          }
        }
      ]
    ];
    for (const paramEntryInequalities of [2, 3, 6, 10, 12]) {
      const numEntriesWithChecks =
        paramEntryInequalities < 3
          ? 1
          : paramEntryInequalities < 6
          ? 2
          : paramEntryInequalities < 10
          ? 3
          : 4;
      const entryMap = new Map(
        typicalEntryIdConfigPairs.concat(
          entryIdConfigPairsWithIneq.slice(0, numEntriesWithChecks)
        )
      );
      const entryIneqSignals = compileCommonEntryInequalities(
        typicalNumericValueConfig,
        entryMap,
        paramEntryInequalities
      );
      expect(entryIneqSignals).to.deep.eq({
        entryInequalityValueIndex: extendedSignalArray(
          [0n, 1n, 0n, 2n, 4n, 2n, 3n, 1n, 4n, 3n].slice(
            0,
            paramEntryInequalities
          ),
          paramEntryInequalities,
          0n
        ),
        entryInequalityOtherValueIndex: extendedSignalArray(
          [4n, 0n, 1n, 5n, 2n, 3n, 5n, 3n, 3n, 0n].slice(
            0,
            paramEntryInequalities
          ),
          paramEntryInequalities,
          0n
        ),
        entryInequalityIsLessThan: array2Bits(
          extendedSignalArray(
            [1n, 1n, 0n, 1n, 1n, 0n, 1n, 0n, 1n, 0n].slice(
              0,
              paramEntryInequalities
            ),
            paramEntryInequalities,
            0n
          )
        )
      });
    }
  });
});

// TODO(POD-P4): More tests
