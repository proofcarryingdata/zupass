import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage, ITicketData } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import { v4 as uuid } from "uuid";
import {
  EdDSATicketFieldsRequest,
  EdDSATicketPrivatePCD,
  EdDSATicketPrivatePCDArgs,
  EdDSATicketPrivatePCDPackage,
  EdDSATicketPrivatePCDTypeName
} from "../src";

const zkeyFilePath = path.join(__dirname, `../artifacts/circuit_final.zkey`);
const wasmFilePath = path.join(
  __dirname,
  `../artifacts/eddsaTicket_js/eddsaTicket.wasm`
);

let toArgs: (
  ticketData: ITicketData,
  fieldsRequested: EdDSATicketFieldsRequest,
  withNullifier: boolean
) => Promise<EdDSATicketPrivatePCDArgs>;

const identity = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

const WATERMARK = BigInt(6);
const EXTERNAL_NULLIFIER = BigInt(42);

describe("EdDSA partial ticket should work", function () {
  this.timeout(1000 * 30);

  let pcd1: EdDSATicketPrivatePCD;

  const ticketData1: ITicketData = {
    // the fields below are not signed and are used for display purposes

    attendeeName: "test name",
    attendeeEmail: "user@test.com",
    eventName: "event",
    ticketName: "ticket",
    checkerEmail: "checker@test.com",

    // the fields below are signed using the server's private eddsa key

    ticketId: "b38501b0-cf66-4416-a4ef-631a9a9b32c4",
    eventId: "4332f16c-8444-4261-94b9-a0ba8ca917e2",
    productId: "c94002fb-2c41-480b-842d-fa826fb517e5",
    timestampConsumed: 0,
    timestampSigned: 1693028498280,
    attendeeSemaphoreId: identity.getCommitment().toString(),
    isConsumed: false,
    isRevoked: false
  };

  const fieldsRequested1: EdDSATicketFieldsRequest = {
    revealTicketId: false,
    revealEventId: true,
    revealProductId: true,
    revealTimestampConsumed: false,
    revealTimestampSigned: false,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false
  };

  this.beforeAll(async function () {
    await EdDSAPCDPackage.init!({});
    await EdDSATicketPCDPackage.init!({});
    if (!EdDSATicketPrivatePCDPackage.init) return;
    await EdDSATicketPrivatePCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });

    toArgs = async (
      ticketData: ITicketData,
      fieldsRequested: EdDSATicketFieldsRequest,
      withNullifier: boolean
    ) => {
      let ticketPCD = await EdDSATicketPCDPackage.prove({
        ticket: {
          value: ticketData,
          argumentType: ArgumentTypeName.Object
        },
        privateKey: {
          value: prvKey,
          argumentType: ArgumentTypeName.String
        },
        id: {
          value: undefined,
          argumentType: ArgumentTypeName.String
        }
      });

      let serializedTicketPCD =
        await EdDSATicketPCDPackage.serialize(ticketPCD);

      let identityPCD = await SemaphoreIdentityPCDPackage.prove({
        identity
      });

      let serializedIdentityPCD =
        await SemaphoreIdentityPCDPackage.serialize(identityPCD);

      const ret: EdDSATicketPrivatePCDArgs = {
        ticket: {
          value: serializedTicketPCD,
          argumentType: ArgumentTypeName.PCD,
          pcdType: EdDSATicketPrivatePCDTypeName
        },
        identity: {
          value: serializedIdentityPCD,
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDTypeName
        },
        fieldsRequested: {
          value: fieldsRequested,
          argumentType: ArgumentTypeName.Object
        },
        watermark: {
          value: WATERMARK.toString(),
          argumentType: ArgumentTypeName.BigInt
        }
      };

      if (withNullifier) {
        ret.externalNullifier = {
          value: EXTERNAL_NULLIFIER.toString(),
          argumentType: ArgumentTypeName.BigInt
        };
      }

      return ret;
    };
  });

  it("should be able to generate and verify a valid proof", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsRequested1, true);
    pcd1 = await EdDSATicketPrivatePCDPackage.prove(pcdArgs);

    const claim = pcd1.claim;
    expect(claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(claim.partialTicket.productId).to.not.be.equal(undefined);

    let verificationRes = await EdDSATicketPrivatePCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should include appropriate externalNullifier and nullifierHash if requested", async function () {
    expect(pcd1.claim.externalNullifier).to.be.equal(
      EXTERNAL_NULLIFIER.toString()
    );
    expect(pcd1.claim.nullifierHash).to.be.not.equal(undefined);
  });

  it("should not verify a proof with invalid partialTicket fields", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsRequested1, true);
    const invalidPCD = await EdDSATicketPrivatePCDPackage.prove(pcdArgs);

    // set ticketId to be some random uuid
    invalidPCD.claim.partialTicket.ticketId = uuid();

    let verificationRes = await EdDSATicketPrivatePCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should not verify a proof with invalid watermark", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsRequested1, true);
    const invalidPCD = await EdDSATicketPrivatePCDPackage.prove(pcdArgs);

    invalidPCD.claim.watermark = "111";

    let verificationRes = await EdDSATicketPrivatePCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should verify a PCD without nullifier requested", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsRequested1, false);
    const pcd2 = await EdDSATicketPrivatePCDPackage.prove(pcdArgs);

    let verificationRes = await EdDSATicketPrivatePCDPackage.verify(pcd2);
    expect(pcd2.claim.externalNullifier).to.equal(undefined);
    expect(pcd2.claim.nullifierHash).to.equal(undefined);
    expect(verificationRes).to.be.true;
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await EdDSATicketPrivatePCDPackage.serialize(pcd1);
    const deserialized = await EdDSATicketPrivatePCDPackage.deserialize(
      serialized.pcd
    );
    const deserializedValid =
      await EdDSATicketPrivatePCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd1).to.deep.eq(deserialized);
  });
});
