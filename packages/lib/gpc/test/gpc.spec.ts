import { POD } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { GPCProofConfig, GPCProofInputs, gpcProve, gpcVerify } from "../src";
import { makeWatermarkSignal } from "../src/gpcUtil";
import {
  GPC_TEST_ARTIFACTS_PATH,
  ownerIdentity,
  privateKey,
  sampleEntries
} from "./common";

describe("gpc library should work", async function () {
  it("gpc should prove and verify a valid case", async function () {
    const pod1 = POD.sign(sampleEntries, privateKey);
    const proofConfig: GPCProofConfig = {
      pods: {
        pod1: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod1.A" },
            owner: { isRevealed: false, isOwnerCommitment: true }
          }
        }
      }
    };
    const proofInputs: GPCProofInputs = {
      pods: { pod1 },
      ownerSemaphoreV3: ownerIdentity,
      externalNullifier: { type: "int", value: 42n },
      watermark: { type: "int", value: 1337n }
    };
    const { proof, boundConfig, revealedClaims } = await gpcProve(
      proofConfig,
      proofInputs,
      GPC_TEST_ARTIFACTS_PATH
    );

    expect(boundConfig.circuitIdentifier).to.eq("proto-pod-gpc_1o-5e-8md");

    // There's nothing non-canonical about our input, so boundConfig should
    // only differ by circuit selection.
    const manuallyBoundConfig = {
      ...proofConfig,
      circuitIdentifier: boundConfig.circuitIdentifier
    };
    expect(boundConfig).to.deep.eq(manuallyBoundConfig);

    expect(revealedClaims).to.deep.eq({
      pods: {
        pod1: {
          entries: { A: { type: "int", value: 123n } },
          signerPublicKey: pod1.signerPublicKey
        }
      },
      externalNullifier: { type: "int", value: 42n },
      nullifierHash: poseidon2([
        makeWatermarkSignal({ type: "int", value: 42n }),
        ownerIdentity.nullifier
      ]),
      watermark: { type: "int", value: 1337n }
    });

    const isVerified = await gpcVerify(
      proof,
      boundConfig,
      revealedClaims,
      GPC_TEST_ARTIFACTS_PATH
    );
    expect(isVerified).to.be.true;
  });
});
