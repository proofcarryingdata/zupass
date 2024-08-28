import { CircuitSignal } from "@pcd/gpcircuits";
import { PODValue } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { compileProofOwner, compileVerifyOwner } from "../src/gpcCompile";
import { makeWatermarkSignal } from "../src/gpcUtil";
import { ownerIdentity } from "./common";

describe("Owner module compilation for proving should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    const circuitOwnerInputs = compileProofOwner(undefined, undefined);
    expect(circuitOwnerInputs).to.deep.eq({
      ownerEntryIndex: BABY_JUB_NEGATIVE_ONE,
      ownerSemaphoreV3IdentityNullifier: BABY_JUB_NEGATIVE_ONE,
      ownerSemaphoreV3IdentityTrapdoor: BABY_JUB_NEGATIVE_ONE,
      ownerExternalNullifier: BABY_JUB_NEGATIVE_ONE,
      ownerIsNullfierHashRevealed: 0n
    });
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const circuitOwnerInputs = compileProofOwner(
          {
            semaphoreV3: ownerIdentity,
            ...(externalNullifier ? { externalNullifier } : {})
          },
          firstOwnerIndex
        );
        expect(circuitOwnerInputs).to.deep.eq({
          ownerEntryIndex: BigInt(firstOwnerIndex),
          ownerSemaphoreV3IdentityNullifier: ownerIdentity.nullifier,
          ownerSemaphoreV3IdentityTrapdoor: ownerIdentity.trapdoor,
          ownerExternalNullifier: makeWatermarkSignal(externalNullifier),
          ownerIsNullfierHashRevealed: BigInt(externalNullifier !== undefined)
        });
      }
    }
  });
  it("should throw for a proof with an owner entry without the necessary input", () => {
    const delayedCircuitOwnerInputs = (): {
      ownerEntryIndex: CircuitSignal;
      ownerSemaphoreV3IdentityNullifier: CircuitSignal;
      ownerSemaphoreV3IdentityTrapdoor: CircuitSignal;
      ownerExternalNullifier: CircuitSignal;
      ownerIsNullfierHashRevealed: CircuitSignal;
    } => compileProofOwner(undefined, 3);
    expect(delayedCircuitOwnerInputs).to.throw;
  });
});
describe("Owner module compilation for verification should work", () => {
  it("should work as expected for a proof with no owner input", () => {
    const { circuitOwnerInputs, circuitOwnerOutputs } = compileVerifyOwner(
      undefined,
      undefined
    );
    expect(circuitOwnerInputs).to.deep.eq({
      ownerEntryIndex: BABY_JUB_NEGATIVE_ONE,
      ownerExternalNullifier: BABY_JUB_NEGATIVE_ONE,
      ownerIsNullfierHashRevealed: 0n
    });
    expect(circuitOwnerOutputs).to.deep.eq({
      ownerRevealedNullifierHash: BABY_JUB_NEGATIVE_ONE
    });
  });
  it("should work as expected for a proof with an owner entry and the necessary input", () => {
    for (const firstOwnerIndex of [0, 3, 10]) {
      for (const externalNullifier of [
        undefined,
        { type: "string", value: "I am a nullifier." },
        { type: "int", value: 5n },
        { type: "cryptographic", value: 127n }
      ] as (PODValue | undefined)[]) {
        const nullifierHash = externalNullifier
          ? poseidon2([
              makeWatermarkSignal(externalNullifier),
              ownerIdentity.nullifier
            ])
          : BABY_JUB_NEGATIVE_ONE;
        const { circuitOwnerInputs, circuitOwnerOutputs } = compileVerifyOwner(
          externalNullifier
            ? {
                externalNullifier,
                nullifierHash
              }
            : undefined,
          firstOwnerIndex
        );
        expect(circuitOwnerInputs).to.deep.eq({
          ownerEntryIndex: BigInt(firstOwnerIndex),
          ownerExternalNullifier: makeWatermarkSignal(externalNullifier),
          ownerIsNullfierHashRevealed: BigInt(externalNullifier !== undefined)
        });
        expect(circuitOwnerOutputs).to.deep.eq({
          ownerRevealedNullifierHash: nullifierHash
        });
      }
    }
  });
});
// TODO(POD-P3): More tests
