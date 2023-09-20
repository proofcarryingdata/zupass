import {
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/util/declarations/circomlibjs.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/util/declarations/snarkjs.d.ts" />
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import { v4 as uuid } from "uuid";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSATicketPCD,
  ZKEdDSATicketPCDArgs,
  ZKEdDSATicketPCDPackage,
  ZKEdDSATicketPCDTypeName
} from "../src";

const zkeyFilePath = path.join(
  __dirname,
  `../artifacts-unsafe/eddsaTicket.zkey`
);
const wasmFilePath = path.join(
  __dirname,
  `../artifacts-unsafe/eddsaTicket_js/eddsaTicket.wasm`
);

let toArgs: (
  ticketData: ITicketData,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  withNullifier: boolean
) => Promise<ZKEdDSATicketPCDArgs>;

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

  let pcd1: ZKEdDSATicketPCD;

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
    isRevoked: false,
    ticketCategory: TicketCategory.Devconnect,
    reservedSignedField1: 1,
    reservedSignedField2: 2,
    reservedSignedField3: 3
  };

  const fieldsToReveal1: EdDSATicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true
  };

  const fieldsToReveal2: EdDSATicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true,
    revealIsConsumed: true,
    revealIsRevoked: true
  };

  const fieldsToReveal3: EdDSATicketFieldsToReveal = {
    revealEventId: false,
    revealAttendeeSemaphoreId: true,
    revealTicketCategory: true,
    revealTimestampConsumed: true,
    revealTimestampSigned: true,
    revealReservedSignedField2: true
  };

  this.beforeAll(async function () {
    await EdDSATicketPCDPackage.init?.({});
    if (!ZKEdDSATicketPCDPackage.init) return;
    await ZKEdDSATicketPCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });

    toArgs = async (
      ticketData: ITicketData,
      fieldsToReveal: EdDSATicketFieldsToReveal,
      withNullifier: boolean
    ) => {
      const ticketPCD = await EdDSATicketPCDPackage.prove({
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

      const serializedTicketPCD =
        await EdDSATicketPCDPackage.serialize(ticketPCD);

      const identityPCD = await SemaphoreIdentityPCDPackage.prove({
        identity
      });

      const serializedIdentityPCD =
        await SemaphoreIdentityPCDPackage.serialize(identityPCD);

      const ret: ZKEdDSATicketPCDArgs = {
        ticket: {
          value: serializedTicketPCD,
          argumentType: ArgumentTypeName.PCD,
          pcdType: ZKEdDSATicketPCDTypeName
        },
        identity: {
          value: serializedIdentityPCD,
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDTypeName
        },
        fieldsToReveal: {
          value: fieldsToReveal,
          argumentType: ArgumentTypeName.Object
        },
        externalNullifier: {
          value: withNullifier ? EXTERNAL_NULLIFIER.toString() : undefined,
          argumentType: ArgumentTypeName.BigInt
        },
        watermark: {
          value: WATERMARK.toString(),
          argumentType: ArgumentTypeName.BigInt
        }
      };

      return ret;
    };
  });

  it("should be able to generate and verify a valid proof", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal1, true);
    pcd1 = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    const claim = pcd1.claim;
    expect(claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(claim.partialTicket.productId).to.not.be.equal(undefined);

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should include appropriate externalNullifier and nullifierHash if requested", async function () {
    expect(pcd1.claim.externalNullifier).to.be.equal(
      EXTERNAL_NULLIFIER.toString()
    );
    expect(pcd1.claim.nullifierHash).to.be.not.equal(undefined);
  });

  it("should not show externalNullifier and nullifierHash if not requested", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal1, false);
    const pcd = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    expect(pcd.claim.externalNullifier).to.be.equal(undefined);
    expect(pcd.claim.nullifierHash).to.be.equal(undefined);

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should reveal isConsumed and isRevoked if requested", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal2, true);
    const pcd = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialTicket.isConsumed).to.be.equal(ticketData1.isConsumed);
    expect(claim.partialTicket.isRevoked).to.be.equal(ticketData1.isRevoked);

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should reveal semaphore ID, ticketCategory, timestamps, and reserved fields if requested, and no more", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal3, true);
    const pcd = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialTicket.attendeeSemaphoreId).to.be.equal(
      ticketData1.attendeeSemaphoreId
    );
    expect(claim.partialTicket.ticketCategory).to.be.equal(
      ticketData1.ticketCategory
    );
    expect(claim.partialTicket.timestampConsumed).to.be.equal(
      ticketData1.timestampConsumed
    );
    expect(claim.partialTicket.timestampSigned).to.be.equal(
      ticketData1.timestampSigned
    );
    expect(claim.partialTicket.reservedSignedField2).to.be.equal(2);

    expect(pcd.claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.eventId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.productId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.isConsumed).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.isRevoked).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.reservedSignedField1).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.reservedSignedField3).to.be.equal(undefined);

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should not verify a proof with invalid partialTicket fields", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal1, true);
    const invalidPCD = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    // set ticketId to be some random uuid
    invalidPCD.claim.partialTicket.ticketId = uuid();

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should not verify a proof with invalid watermark", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal1, true);
    const invalidPCD = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    invalidPCD.claim.watermark = "111";

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should verify a PCD without nullifier requested", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal1, false);
    const pcd2 = await ZKEdDSATicketPCDPackage.prove(pcdArgs);

    const verificationRes = await ZKEdDSATicketPCDPackage.verify(pcd2);
    expect(pcd2.claim.externalNullifier).to.equal(undefined);
    expect(pcd2.claim.nullifierHash).to.equal(undefined);
    expect(verificationRes).to.be.true;
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await ZKEdDSATicketPCDPackage.serialize(pcd1);
    const deserialized = await ZKEdDSATicketPCDPackage.deserialize(
      serialized.pcd
    );
    const deserializedValid =
      await ZKEdDSATicketPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd1).to.deep.eq(deserialized);
  });
});
