import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { CircuitSignal } from "../src";
import {
  OwnerModuleSemaphoreV3Inputs,
  OwnerModuleSemaphoreV3OutputNamesType,
  OwnerModuleSemaphoreV3Outputs,
  OwnerModuleSemaphoreV3nputNamesType
} from "../src/owner";
import { circomkit, ownerIdentity } from "./common";

describe("owner.OwnerModuleSemaphoreV3 should work", function () {
  let circuit: WitnessTester<
    OwnerModuleSemaphoreV3nputNamesType,
    OwnerModuleSemaphoreV3OutputNamesType
  >;

  function makeTestSignals(
    isEnabled: boolean,
    isNullfierHashRevealed: boolean
  ): {
    inputs: OwnerModuleSemaphoreV3Inputs;
    outputs: OwnerModuleSemaphoreV3Outputs;
  } {
    return {
      inputs: {
        enabled: isEnabled ? 1n : 0n,
        identityNullifier: ownerIdentity.nullifier,
        identityTrapdoor: ownerIdentity.trapdoor,
        identityCommitment: ownerIdentity.commitment,
        externalNullifier: 42n,
        isNullfierHashRevealed: isNullfierHashRevealed ? 1n : 0n
      },
      outputs: {
        revealedNullifierHash:
          isEnabled && isNullfierHashRevealed
            ? 1517081033071132720435657432021139876572843496027662548196342287861804968602n
            : BABY_JUB_NEGATIVE_ONE
      }
    };
  }

  const sampleInput: OwnerModuleSemaphoreV3Inputs = {
    enabled: 1n,
    identityNullifier:
      99353161014976810914716773124042455250852206298527174581112949561812190422n,
    identityTrapdoor:
      329061722381819402313027227353491409557029289040211387019699013780657641967n,
    identityCommitment:
      18711405342588116796533073928767088921854096266145046362753928030796553161041n,
    externalNullifier: 42n,
    isNullfierHashRevealed: 1n
  };

  const sampleOutput: OwnerModuleSemaphoreV3Outputs = {
    revealedNullifierHash:
      1517081033071132720435657432021139876572843496027662548196342287861804968602n
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("OwnerModuleSemaphoreV3", {
      file: "owner",
      template: "OwnerModuleSemaphoreV3"
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
        ["externalNullifier", "enabled", "isNullfierHashRevealed"].includes(
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
