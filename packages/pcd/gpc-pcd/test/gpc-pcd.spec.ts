import {
  GPCProofConfig,
  gpcBindConfig,
  podMembershipListsToSimplifiedJSON,
  serializeGPCProofConfig
} from "@pcd/gpc";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEdDSAPublicKeyValue, PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import path from "path";
import { v4 as uuid } from "uuid";
import { GPCPCDArgs, GPCPCDPackage } from "../src";

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits/artifacts/test"
);

export const GPC_NPM_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../../node_modules/@pcd/proto-pod-gpc-artifacts"
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001
export const privateKey2 = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAQFBggIAAA"; // hex 0001020304050607080900010203040506070809000102030404050608080000

export const ownerIdentity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// 11 entries, max depth 5
// Defined out of order, but will be sorted by POD construction.
export const sampleEntries0 = {
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

export const sampleEntries1 = {
  attendee: { type: "cryptographic", value: ownerIdentity.commitment },
  eventID: { type: "cryptographic", value: 456n },
  ticketID: { type: "cryptographic", value: 999n }
} satisfies PODEntries;

describe("GPCPCD should work", async function () {
  async function runGPCPCDTest(artifactsPath: string): Promise<void> {
    GPCPCDPackage.init?.({ zkArtifactPath: artifactsPath });

    const proofConfig: GPCProofConfig = {
      pods: {
        pod0: {
          entries: {
            A: { isRevealed: true },
            E: { isRevealed: false, equalsEntry: "pod0.A" },
            owner: {
              isRevealed: false,
              isOwnerID: true,
              isMemberOf: "admissibleOwners"
            }
          }
        },
        ticketPOD: {
          entries: {
            ticketID: {
              isRevealed: false,
              isMemberOf: "admissibleTickets"
            }
          },
          signerPublicKey: {
            isRevealed: false,
            isMemberOf: "admissibleTicketIssuers"
          }
        }
      },
      tuples: {
        pair: { entries: ["pod0.A", "pod0.E"], isMemberOf: "admissiblePairs" }
      }
    };

    const pod0 = POD.sign(sampleEntries0, privateKey);
    const podPCD0 = new PODPCD(uuid(), pod0);

    const ticketPOD = POD.sign(sampleEntries1, privateKey2);
    const ticketPODPCD = new PODPCD(uuid(), ticketPOD);

    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: ownerIdentity
    });

    const proveArgs: GPCPCDArgs = {
      proofConfig: {
        argumentType: ArgumentTypeName.String,
        value: serializeGPCProofConfig(proofConfig)
      },
      pods: {
        value: {
          pod0: {
            value: await PODPCDPackage.serialize(podPCD0),
            argumentType: ArgumentTypeName.PCD
          },
          ticketPOD: {
            value: await PODPCDPackage.serialize(ticketPODPCD),
            argumentType: ArgumentTypeName.PCD
          }
        },
        argumentType: ArgumentTypeName.RecordContainer
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
      membershipLists: {
        value: podMembershipListsToSimplifiedJSON({
          admissibleOwners: [
            sampleEntries0.F,
            sampleEntries0.C,
            sampleEntries0.owner
          ],
          admissiblePairs: [
            [sampleEntries0.D, sampleEntries0.B],
            [sampleEntries0.A, sampleEntries0.E],
            [sampleEntries0.owner, sampleEntries0.I],
            [sampleEntries0.J, sampleEntries0.H]
          ],
          admissibleTickets: [
            sampleEntries0.C,
            sampleEntries0.owner,
            sampleEntries1.ticketID
          ],
          admissibleTicketIssuers: [
            ticketPOD.signerPublicKey,
            "f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f",
            "755224af31d5b5e47cc6ca8827b8bf9d2ceba48bf439907abaade0a3269d561b"
          ].map(PODEdDSAPublicKeyValue)
        }),
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
      pod0.signerPublicKey
    );
    expect(gpcPCD.claim.revealed.pods.pod0.entries?.A?.value).to.eq(123n);
    expect(gpcPCD.claim.revealed.pods.ticketPOD).to.be.undefined;
    expect(gpcPCD.claim.revealed.owner?.externalNullifier).to.not.be.undefined;
    expect(gpcPCD.claim.revealed.owner?.nullifierHash).to.not.be.undefined;
    expect(gpcPCD.claim.revealed.watermark?.value).to.eq("some watermark");
    expect(gpcPCD.claim.config.circuitIdentifier).to.eq(
      "proto-pod-gpc_3o-10e-8md-4bc-4x20l-5x2t"
    );

    expect(await GPCPCDPackage.verify(gpcPCD)).to.be.true;

    const serialized = await GPCPCDPackage.serialize(gpcPCD);
    const deserialized = await GPCPCDPackage.deserialize(serialized.pcd);
    expect(await GPCPCDPackage.verify(deserialized)).to.be.true;
  }

  it("GPCPCD should prove and verify with test artifacts", async function () {
    // Confirms that the code in the repo is compatible with circuit
    // artifacts built from circuits in the repo.
    await runGPCPCDTest(GPC_TEST_ARTIFACTS_PATH);
  });

  it("GPCPCD should prove and verify with NPM artifacts", async function () {
    // Confirms that the code in the repo is compatible with circuit
    // artifacts released on NPM.
    await runGPCPCDTest(GPC_NPM_ARTIFACTS_PATH);
  });
});

// TODO(POD-P1): Full unit-test suite beyond single prototype.
