import { EdDSATicketPCDPackage, ITicketData } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/util/declarations/circomlibjs.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../src/util/declarations/snarkjs.d.ts" />
import { BABY_JUB_NEGATIVE_ONE, uuidToBigInt } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { expect } from "chai";
import "mocha";
import * as path from "path";
import { v4 as uuid } from "uuid";
import {
  EdDSATicketFieldsToReveal,
  VALID_EVENT_IDS_MAX_LEN,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName,
  snarkInputForValidEventIds
} from "../src";

const zkeyFilePath = path.join(
  __dirname,
  `../artifacts-unsafe/eddsaEventTicket.zkey`
);
const wasmFilePath = path.join(
  __dirname,
  `../artifacts-unsafe/eddsaEventTicket_js/eddsaEventTicket.wasm`
);

let toArgs: (
  ticketData: ITicketData,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  withNullifier: boolean,
  validEventIds?: string[]
) => Promise<ZKEdDSAEventTicketPCDArgs>;

const identity1 = new Identity(
  '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

const identity2 = new Identity(
  '["222061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

const WATERMARK = BigInt(6);
const EXTERNAL_NULLIFIER = BigInt(42);

describe("snarkInputFromValidEventIds helper", function () {
  it("should handle undefined input", async function () {
    expect(snarkInputForValidEventIds(undefined)).deep.equal(
      Array(VALID_EVENT_IDS_MAX_LEN).fill(BABY_JUB_NEGATIVE_ONE.toString())
    );
  });
  it("should handle empty input", async function () {
    expect(snarkInputForValidEventIds([])).deep.equal(
      Array(VALID_EVENT_IDS_MAX_LEN).fill(BABY_JUB_NEGATIVE_ONE.toString())
    );
  });
  it("should handle short input", async function () {
    const expected = Array(VALID_EVENT_IDS_MAX_LEN).fill(
      BABY_JUB_NEGATIVE_ONE.toString()
    );
    const input = [uuid().toString(), uuid().toString(), uuid().toString()];
    for (let i = 0; i < input.length; i++) {
      expected[i] = uuidToBigInt(input[i]).toString();
    }
    expect(snarkInputForValidEventIds(input)).deep.equal(expected);
  });
  it("should handle full input", async function () {
    const input: string[] = [];
    const expected: string[] = [];
    for (let i = 0; i < VALID_EVENT_IDS_MAX_LEN; i++) {
      const id = uuid();
      input.push(id.toString());
      expected.push(uuidToBigInt(id.toString()).toString());
    }
    expect(snarkInputForValidEventIds(input)).deep.equal(expected);
  });
});

describe("ZKEdDSAEventTicketPCD should work", function () {
  this.timeout(1000 * 30);

  let pcd1: ZKEdDSAEventTicketPCD;

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
    attendeeSemaphoreId: identity1.getCommitment().toString(),
    isConsumed: false,
    isRevoked: false
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

  // validEventIds1 contains ticketData1.eventId
  const validEventIds1: string[] = [
    uuid(),
    ticketData1.eventId,
    uuid(),
    uuid()
  ];

  // validEventIds2 does not contain ticketData1.eventId
  const validEventIds2: string[] = [uuid(), uuid(), uuid(), uuid()];

  async function makeSerializedIdentityPCD(
    identity: Identity
  ): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: identity
    });

    return await SemaphoreIdentityPCDPackage.serialize(identityPCD);
  }

  this.beforeAll(async function () {
    await EdDSATicketPCDPackage.init?.({});
    if (!ZKEdDSAEventTicketPCDPackage.init) return;
    await ZKEdDSAEventTicketPCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });

    toArgs = async (
      ticketData: ITicketData,
      fieldsToReveal: EdDSATicketFieldsToReveal,
      withNullifier: boolean,
      validEventIds?: string[]
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

      const serializedIdentityPCD = await makeSerializedIdentityPCD(identity1);

      const ret: ZKEdDSAEventTicketPCDArgs = {
        ticket: {
          value: serializedTicketPCD,
          argumentType: ArgumentTypeName.PCD,
          pcdType: ZKEdDSAEventTicketPCDTypeName
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
        validEventIds: {
          value: validEventIds,
          argumentType: ArgumentTypeName.StringArray
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
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIds1
    );
    pcd1 = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    const claim = pcd1.claim;
    expect(claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(claim.partialTicket.productId).to.not.be.equal(undefined);

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should include appropriate externalNullifier and nullifierHash if requested", async function () {
    expect(pcd1.claim.externalNullifier).to.be.equal(
      EXTERNAL_NULLIFIER.toString()
    );
    expect(pcd1.claim.nullifierHash).to.be.not.equal(undefined);
  });

  it("should include validEventIds in claim", async function () {
    expect(pcd1.claim.validEventIds).deep.equal(validEventIds1);
  });

  it("should not show externalNullifier and nullifierHash if not requested", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      false /* withNullifier */,
      validEventIds1
    );
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    expect(pcd.claim.externalNullifier).to.be.equal(undefined);
    expect(pcd.claim.nullifierHash).to.be.equal(undefined);

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should reveal isConsumed and isRevoked if requested", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal2,
      true /* withNullifier */,
      validEventIds1
    );
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialTicket.isConsumed).to.be.equal(ticketData1.isConsumed);
    expect(claim.partialTicket.isRevoked).to.be.equal(ticketData1.isRevoked);

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should prove and verify without any validEventIds", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */
    );
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);
    expect(pcd.claim.validEventIds).to.be.undefined;
    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should not prove if identity is not in ticket", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIds2
    );
    pcdArgs.identity = {
      value: await makeSerializedIdentityPCD(identity2),
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName
    };
    await assert.rejects(async () => {
      await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);
    });
  });

  it("should not prove if ticket is not in validEventIds", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIds2
    );
    await assert.rejects(async () => {
      await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);
    });
  });

  it("should not verify a proof with invalid partialTicket fields", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIds1
    );
    const invalidPCD = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    // set ticketId to be some random uuid
    invalidPCD.claim.partialTicket.ticketId = uuid();

    const verificationRes =
      await ZKEdDSAEventTicketPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should not verify a proof with invalid watermark", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIds1
    );
    const invalidPCD = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    invalidPCD.claim.watermark = "111";

    const verificationRes =
      await ZKEdDSAEventTicketPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await ZKEdDSAEventTicketPCDPackage.serialize(pcd1);
    const deserialized = await ZKEdDSAEventTicketPCDPackage.deserialize(
      serialized.pcd
    );
    const deserializedValid =
      await ZKEdDSAEventTicketPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd1).to.deep.eq(deserialized);
  });
});
