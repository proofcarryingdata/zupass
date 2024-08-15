import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon1 } from "poseidon-lite";
import {
  CircuitSignal,
  OwnerModuleSemaphoreV4Inputs,
  OwnerModuleSemaphoreV4OutputNamesType,
  OwnerModuleSemaphoreV4Outputs,
  OwnerModuleSemaphoreV4nputNamesType
} from "../src";
import { circomkit, ownerIdentityV4 } from "./common";

describe("owner.OwnerModuleSemaphoreV4 should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    OwnerModuleSemaphoreV4nputNamesType,
    OwnerModuleSemaphoreV4OutputNamesType
  >;

  function makeTestSignals(
    isEnabled: boolean,
    isNullifierHashRevealed: boolean
  ): {
    inputs: OwnerModuleSemaphoreV4Inputs;
    outputs: OwnerModuleSemaphoreV4Outputs;
  } {
    return {
      inputs: {
        enabled: isEnabled ? 1n : 0n,
        secretScalar: ownerIdentityV4.secretScalar,
        identityCommitmentHash: poseidon1([ownerIdentityV4.commitment]),
        externalNullifier: 42n,
        isNullifierHashRevealed: isNullifierHashRevealed ? 1n : 0n
      },
      outputs: {
        revealedNullifierHash:
          isEnabled && isNullifierHashRevealed
            ? 894567425121403332266040643563918773524317789061280615331238253663051803519n
            : BABY_JUB_NEGATIVE_ONE
      }
    };
  }

  const sampleInput: OwnerModuleSemaphoreV4Inputs = {
    enabled: 1n,
    secretScalar:
      1066921846450608811029566588127247112676112021489928135893407497485658369605n,
    identityCommitmentHash:
      10822224854462305974571008723353998025009741997958237435994986683037289495571n,
    externalNullifier: 42n,
    isNullifierHashRevealed: 1n
  };

  const sampleOutput: OwnerModuleSemaphoreV4Outputs = {
    revealedNullifierHash:
      894567425121403332266040643563918773524317789061280615331238253663051803519n
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("OwnerModuleSemaphoreV4", {
      file: "ownerV4",
      template: "OwnerModuleSemaphoreV4"
    });
  });

  it("should accept a sample object", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should accept when enabled", async () => {
    let { inputs, outputs } = makeTestSignals(
      true /* isEnabled */,
      true /* isNullifierHashRevealed */
    );
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      true /* isEnabled */,
      false /* isNullifierHashRevealed */
    ));
    await circuit.expectPass(inputs, outputs);
  });

  it("should accept when disabled", async () => {
    let { inputs, outputs } = makeTestSignals(
      false /* isEnabled */,
      true /* isNullifierHashRevealed */
    );
    await circuit.expectPass(inputs, outputs);

    ({ inputs, outputs } = makeTestSignals(
      false /* isEnabled */,
      false /* isNullifierHashRevealed */
    ));
    await circuit.expectPass(inputs, outputs);
  });

  it("should reject corrupted input", async () => {
    const { inputs } = makeTestSignals(
      true /* isEnabled */,
      true /* isNullifierHashRevealed */
    );
    for (const inputName of Object.keys(inputs)) {
      const badInput = { ...sampleInput };
      (badInput as Record<string, CircuitSignal>)[inputName] = 0xbadn;
      if (
        ["externalNullifier", "enabled", "isNullifierHashRevealed"].includes(
          inputName
        )
      ) {
        // externalNullifier and boolean inputs aren't directly constrained,
        // but will cause the wrong output.
        const badOutput = await circuit.compute(badInput, [
          "revealedNullifierHash"
        ]);
        expect(badOutput.revealedNullifierHash).to.not.eq(
          sampleOutput.revealedNullifierHash
        );
      } else {
        await circuit.expectFail(badInput);
      }
    }
  });
});
