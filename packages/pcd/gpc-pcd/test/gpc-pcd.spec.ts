import {
  GPCProofConfig,
  gpcBindConfig,
  serializeGPCProofConfig
} from "@pcd/gpc";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import path from "path";
import { v4 as uuid } from "uuid";
import { GPCPCDArgs, GPCPCDPackage } from "../src";

// TODO(POD-P0): Make this a helper in gpcircuits?
export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits/artifacts/test"
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// 11 entries, max depth 5
// Defined out of order, but will be sorted by POD construction.
export const sampleEntries = {
  E: { type: "cryptographic", value: 123n },
  F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n },
  owner: { type: "cryptographic", value: ownerIdentity.commitment }
} satisfies PODEntries;

describe("GPCPCD should work", async function () {
  this.beforeAll(async () => {
    GPCPCDPackage.init?.({ zkArtifactPath: GPC_TEST_ARTIFACTS_PATH });
  });

  it("GPCPCD should prove and verify", async function () {
    const proofConfig: GPCProofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod0.A" },
            owner: { isRevealed: false, isOwnerCommitment: true }
          }
        }
      }
    };

    const pod = POD.sign(sampleEntries, privateKey);
    const podPCD = new PODPCD(uuid(), pod);

    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: ownerIdentity
    });

    const proveArgs: GPCPCDArgs = {
      proofConfig: {
        argumentType: ArgumentTypeName.String,
        value: serializeGPCProofConfig(proofConfig)
      },
      pod: {
        value: await PODPCDPackage.serialize(podPCD),
        argumentType: ArgumentTypeName.PCD
      },
      identity: {
        value: await SemaphoreIdentityPCDPackage.serialize(identityPCD),
        argumentType: ArgumentTypeName.PCD
      },
      externalNullifier: {
        value: "some external nullifier",
        argumentType: ArgumentTypeName.String
      },
      watermark: {
        value: "some watermark",
        argumentType: ArgumentTypeName.String
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      }
    };
    const gpcPCD = await GPCPCDPackage.prove(proveArgs);
    expect(gpcPCD.claim.config).to.deep.eq(
      gpcBindConfig(proofConfig).boundConfig
    );
    expect(gpcPCD.claim.revealed.pods.pod0.signerPublicKey).to.eq(
      pod.signerPublicKey
    );
    expect(gpcPCD.claim.revealed.pods.pod0.entries?.A?.value).to.eq(123n);
    expect(gpcPCD.claim.revealed.externalNullifier).to.not.be.undefined;
    expect(gpcPCD.claim.revealed.watermark?.value).to.eq("some watermark");
    expect(gpcPCD.claim.config.circuitIdentifier).to.eq(
      "proto-pod-gpc_1o-5e-8md"
    );

    expect(await GPCPCDPackage.verify(gpcPCD)).to.be.true;

    const serialized = await GPCPCDPackage.serialize(gpcPCD);
    const deserialized = await GPCPCDPackage.deserialize(serialized.pcd);
    expect(await GPCPCDPackage.verify(deserialized)).to.be.true;
  });
});
