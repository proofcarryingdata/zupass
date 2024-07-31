import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  IPODTicketData,
  PODTicketPCDPackage,
  TicketCategory
} from "@pcd/pod-ticket-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  checkClaimAgainstProofRequest,
  makeProofRequest,
  ZKPODTicketPCDArgs
} from "../src";
import {
  init,
  prove,
  ZKPODTicketPCDPackage
} from "../src/ZKPODTicketPCDPackage";

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../lib/gpcircuits/artifacts/test"
);

export const GPC_NPM_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../../node_modules/@pcd/proto-pod-gpc-artifacts"
);

const identity1 = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

async function makeSerializedIdentityPCD(
  identity: Identity
): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identity: identity
  });

  return await SemaphoreIdentityPCDPackage.serialize(identityPCD);
}

describe("zk-pod-ticket-pcd should work", async function () {
  this.beforeAll(async function () {
    await init({ zkArtifactPath: GPC_NPM_ARTIFACTS_PATH });
  });

  it("zk-pod-ticket-pcd should do something", async function () {
    const ticketData: IPODTicketData = {
      eventId: uuidv4(),
      productId: uuidv4(),
      ticketId: uuidv4(),
      timestampConsumed: 1,
      timestampSigned: 1,
      attendeeSemaphoreId: identity1.getCommitment().toString(),
      isConsumed: true,
      eventName: "Event 1",
      ticketName: "Ticket 1",
      isRevoked: false,
      ticketCategory: TicketCategory.Generic,
      attendeeName: "Attendee 1",
      attendeeEmail: "attendee1@example.com"
    };

    const id = uuidv4();

    const ticket = await PODTicketPCDPackage.prove({
      ticket: {
        argumentType: ArgumentTypeName.Object,
        value: ticketData
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: prvKey
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: id
      },
      extraEntries: {
        argumentType: ArgumentTypeName.Object,
        value: {}
      }
    });

    const serializedTicket = await PODTicketPCDPackage.serialize(ticket);
    const serializedIdentity = await makeSerializedIdentityPCD(identity1);

    const pubKey = ticket.claim.signerPublicKey;

    const proveArgs: ZKPODTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedTicket,
        validatorParams: {
          ticketPatterns: [
            {
              signerPublicKey: pubKey,
              events: [
                {
                  id: ticketData.eventId,
                  productIds: [ticketData.productId]
                }
              ]
            }
          ],
          notFoundMessage: "Not found"
        }
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: serializedIdentity
      },
      fieldsToReveal: { argumentType: ArgumentTypeName.ToggleList, value: {} },
      revealSignerPublicKey: {
        argumentType: ArgumentTypeName.Boolean,
        value: true
      },
      watermark: { argumentType: ArgumentTypeName.String, value: "0" },
      externalNullifier: {
        argumentType: ArgumentTypeName.String,
        value: "0"
      }
    };

    const zkTicket = await prove(proveArgs);

    expect(zkTicket).to.exist;
    expect(zkTicket.claim.watermark.value).to.equal("0");
    expect(zkTicket.claim.externalNullifier.value).to.equal("0");

    expect(await ZKPODTicketPCDPackage.verify(zkTicket)).to.equal(true);
    expect(
      checkClaimAgainstProofRequest(zkTicket.claim, makeProofRequest(proveArgs))
    ).to.not.throw;
  });
});
