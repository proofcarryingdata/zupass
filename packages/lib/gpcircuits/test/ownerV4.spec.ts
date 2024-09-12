import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon2 } from "poseidon-lite";
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
    const externalNullifier = 42n;
    return {
      inputs: {
        enabled: isEnabled ? 1n : 0n,
        secretScalar: ownerIdentityV4.secretScalar,
        identityCommitment: ownerIdentityV4.commitment,
        externalNullifier,
        isNullifierHashRevealed: isNullifierHashRevealed ? 1n : 0n
      },
      outputs: {
        revealedNullifierHash:
          isEnabled && isNullifierHashRevealed
            ? poseidon2([externalNullifier, ownerIdentityV4.secretScalar])
            : BABY_JUB_NEGATIVE_ONE
      }
    };
  }

  const sampleInput: OwnerModuleSemaphoreV4Inputs = {
    enabled: 1n,
    secretScalar:
      2216916178205221996784875615548956289937038466803771088017302823987023506835n,
    identityCommitment:
      15170632554331862997050742014395807449361562342470859240457119918675786875630n,
    externalNullifier: 42n,
    isNullifierHashRevealed: 1n
  };

  const sampleOutput: OwnerModuleSemaphoreV4Outputs = {
    revealedNullifierHash:
      6116400069185604620537879245252081108418163848212598544276099192936153798105n
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
