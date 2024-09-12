import { CircuitSignal } from "@pcd/gpcircuits";
import { PODValue } from "@pcd/pod";
import {
  BABY_JUB_NEGATIVE_ONE,
  BABY_JUB_SUBGROUP_ORDER_MINUS_ONE
} from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import {
  compileProofOwnerV3,
  compileProofOwnerV4,
  compileProofPODUniqueness,
  compileVerifyOwnerV3,
  compileVerifyOwnerV4
} from "../src/gpcCompile";
import { makeWatermarkSignal } from "../src/gpcUtil";
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
      uniquenessModuleIsEnabled: 1n
    });
  });
  it("should work as expected for a proof configuration with POD uniqueness disabled", () => {
    for (const config of [{}, { uniquePODs: false }]) {
      expect(compileProofPODUniqueness(config)).to.deep.equal({
        uniquenessModuleIsEnabled: 0n
      });
    }
  });
});
// TODO(POD-P3): More tests
