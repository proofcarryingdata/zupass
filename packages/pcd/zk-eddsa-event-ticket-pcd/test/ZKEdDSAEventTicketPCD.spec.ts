import assert from "assert";
import { expect } from "chai";
import * as path from "path";
import { v4 as uuid } from "uuid";

import {
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { BABY_JUB_NEGATIVE_ONE, uuidToBigInt } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";

import {
  EdDSATicketFieldsToReveal,
  snarkInputForValidEventIds,
  VALID_EVENT_IDS_MAX_LEN,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDClaim,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName
} from "../src";

import "mocha";

const zkeyFilePath = path.join(__dirname, `../artifacts/circuit.zkey`);
const wasmFilePath = path.join(__dirname, `../artifacts/circuit.wasm`);

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
  it("should handle undefined input", function () {
    expect(snarkInputForValidEventIds(undefined)).deep.equal(
      Array(VALID_EVENT_IDS_MAX_LEN).fill(BABY_JUB_NEGATIVE_ONE.toString())
    );
  });
  it("should handle empty input", function () {
    expect(snarkInputForValidEventIds([])).deep.equal(
      Array(VALID_EVENT_IDS_MAX_LEN).fill(BABY_JUB_NEGATIVE_ONE.toString())
    );
  });
  it("should handle short input", function () {
    const expected = Array(VALID_EVENT_IDS_MAX_LEN).fill(
      BABY_JUB_NEGATIVE_ONE.toString()
    );
    const input = [uuid().toString(), uuid().toString(), uuid().toString()];
    for (let i = 0; i < input.length; i++) {
      expected[i] = uuidToBigInt(input[i]).toString();
    }
    expect(snarkInputForValidEventIds(input)).deep.equal(expected);
  });
  it("should handle full input", function () {
    const input: string[] = [];
    const expected: string[] = [];
    for (let i = 0; i < VALID_EVENT_IDS_MAX_LEN; i++) {
      const id = uuid();
      input.push(id.toString());
      expected.push(uuidToBigInt(id.toString()).toString());
    }
    expect(snarkInputForValidEventIds(input)).deep.equal(expected);
  });
  it("should reject input if too large", function () {
    const input: string[] = [];
    const expected: string[] = [];
    for (let i = 0; i < VALID_EVENT_IDS_MAX_LEN + 1; i++) {
      const id = uuid();
      input.push(id.toString());
      expected.push(uuidToBigInt(id.toString()).toString());
    }
    assert.throws(() => {
      snarkInputForValidEventIds(input);
    });
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
    isRevoked: false,
    ticketCategory: TicketCategory.Devconnect
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
    revealTimestampSigned: true
  };

  const fieldsToReveal4: EdDSATicketFieldsToReveal = {
    revealAttendeeEmail: true,
    revealAttendeeName: true
  };

  const fieldsToRevealNone: EdDSATicketFieldsToReveal = {
    revealTicketId: false,
    revealEventId: false,
    revealProductId: false,
    revealTimestampConsumed: false,
    revealTimestampSigned: false,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false,
    revealTicketCategory: false,
    revealAttendeeEmail: false,
    revealAttendeeName: false
  };

  const fieldsToRevealAll: EdDSATicketFieldsToReveal = {
    revealTicketId: true,
    revealEventId: true,
    revealProductId: true,
    revealTimestampConsumed: true,
    revealTimestampSigned: true,
    revealAttendeeSemaphoreId: true,
    revealIsConsumed: true,
    revealIsRevoked: true,
    revealTicketCategory: true,
    revealAttendeeEmail: true,
    revealAttendeeName: true
  };

  const validEventIdsContainingTicket: string[] = [
    uuid(),
    ticketData1.eventId,
    uuid(),
    uuid()
  ];

  const validEventIdsNoTicket: string[] = [uuid(), uuid(), uuid(), uuid()];

  async function makeSerializedIdentityPCD(
    identity: Identity
  ): Promise<SerializedPCD<SemaphoreIdentityPCD>> {
    const identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity: identity
    });

    return await SemaphoreIdentityPCDPackage.serialize(identityPCD);
  }

  async function toArgs(
    ticketData: ITicketData,
    fieldsToReveal: EdDSATicketFieldsToReveal,
    withNullifier: boolean,
    validEventIds?: string[]
  ): Promise<ZKEdDSAEventTicketPCDArgs> {
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
        argumentType: ArgumentTypeName.ToggleList
      },
      validEventIds: {
        value: validEventIds,
        argumentType: ArgumentTypeName.StringArray
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
  }

  this.beforeAll(async function () {
    await EdDSATicketPCDPackage.init?.({});
    if (!ZKEdDSAEventTicketPCDPackage.init) return;
    await ZKEdDSAEventTicketPCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });
  });

  it("should be able to generate and verify a valid proof", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIdsContainingTicket
    );
    pcd1 = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    const claim = pcd1.claim;
    expect(claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(claim.partialTicket.productId).to.not.be.equal(undefined);

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd1);
    expect(verificationRes).to.be.true;
  });

  it("should include appropriate externalNullifier and nullifierHash if requested", function () {
    expect(pcd1.claim.externalNullifier).to.be.equal(
      EXTERNAL_NULLIFIER.toString()
    );
    expect(pcd1.claim.nullifierHash).to.be.not.equal(undefined);
  });

  it("should include validEventIds in claim", async function () {
    expect(pcd1.claim.validEventIds).deep.equal(validEventIdsContainingTicket);
  });

  it("should not show externalNullifier and nullifierHash if not requested", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      false /* withNullifier */,
      validEventIdsContainingTicket
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
      validEventIdsContainingTicket
    );
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialTicket.isConsumed).to.be.equal(ticketData1.isConsumed);
    expect(claim.partialTicket.isRevoked).to.be.equal(ticketData1.isRevoked);

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should reveal attendeeEmail and attendeeName if requested", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal4,
      true /* withNullifier */,
      validEventIdsContainingTicket
    );
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    const claim = pcd.claim;
    expect(claim.partialTicket.attendeeEmail).to.be.equal(
      ticketData1.attendeeEmail
    );
    expect(claim.partialTicket.attendeeName).to.be.equal(
      ticketData1.attendeeName
    );

    const verificationRes = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
    expect(verificationRes).to.be.true;
  });

  it("should reveal semaphore ID, ticketCategory, and timestamps if requested, and no more", async function () {
    const pcdArgs = await toArgs(ticketData1, fieldsToReveal3, true);
    const pcd = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

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

    expect(pcd.claim.partialTicket.ticketId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.eventId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.productId).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.isConsumed).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.isRevoked).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.attendeeEmail).to.be.equal(undefined);
    expect(pcd.claim.partialTicket.attendeeName).to.be.equal(undefined);

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

  async function testProveBadArgs(
    validArgs: ZKEdDSAEventTicketPCDArgs,
    mutateArgs: (args: ZKEdDSAEventTicketPCDArgs) => Promise<void>
  ): Promise<void> {
    // Clone validArgs to mutate them into invalidArgs while keeping originals.
    const invalidArgs: ZKEdDSAEventTicketPCDArgs = JSON.parse(
      JSON.stringify(validArgs)
    );
    await mutateArgs(invalidArgs);
    await assert.rejects(async () => {
      await ZKEdDSAEventTicketPCDPackage.prove(invalidArgs);
    });
  }

  async function testProveBadTicketArgs(
    validArgs: ZKEdDSAEventTicketPCDArgs,
    mutateTicket: (ticket: ITicketData) => Promise<void>
  ): Promise<void> {
    await testProveBadArgs(
      validArgs,
      async (args: ZKEdDSAEventTicketPCDArgs) => {
        if (!args.ticket.value?.pcd) {
          throw new Error("bad test data?");
        }
        const ticketPCD = await EdDSATicketPCDPackage.deserialize(
          args.ticket.value.pcd
        );
        mutateTicket(ticketPCD.claim.ticket);
        args.ticket.value = await EdDSATicketPCDPackage.serialize(ticketPCD);
      }
    );
  }

  it("should not prove with incorrect args", async function () {
    const validArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIdsNoTicket
    );

    const otherIdentityPCD = await makeSerializedIdentityPCD(identity2);

    // Ticket args set to incorrect values one at a time.
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.ticketId = uuid();
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.eventId = uuid();
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.productId = uuid();
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.timestampConsumed = 123;
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.timestampSigned = 123;
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.attendeeSemaphoreId = "123";
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.isConsumed = !ticket.isConsumed;
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.isRevoked = !ticket.isRevoked;
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.attendeeEmail = "invalid@example.com";
    });
    await testProveBadTicketArgs(validArgs, async (ticket: ITicketData) => {
      ticket.attendeeName = "Invalid Name";
    });

    // Non-ticket arguments set to incorrect values.
    await testProveBadArgs(
      validArgs,
      async (args: ZKEdDSAEventTicketPCDArgs) => {
        args.identity.value = otherIdentityPCD;
      }
    );
    await testProveBadArgs(
      validArgs,
      async (args: ZKEdDSAEventTicketPCDArgs) => {
        args.validEventIds.value = validEventIdsNoTicket;
      }
    );
  });

  it("should not prove if validEventIds is too large", async function () {
    const validEventIdsTooLarge = Array<string>(
      VALID_EVENT_IDS_MAX_LEN + 1
    ).fill(uuid());
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToReveal1,
      true /* withNullifier */,
      validEventIdsTooLarge
    );
    await assert.rejects(async () => {
      await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);
    });
  });

  async function testVerifyBadClaim(
    validPCD: ZKEdDSAEventTicketPCD,
    mutateClaim: (claim: ZKEdDSAEventTicketPCDClaim) => void
  ): Promise<void> {
    // Clone the valid PCD so we can mutate it to be invalid.
    const invalidPCD: ZKEdDSAEventTicketPCD = JSON.parse(
      JSON.stringify(validPCD)
    );
    mutateClaim(invalidPCD.claim);

    const verificationRes =
      await ZKEdDSAEventTicketPCDPackage.verify(invalidPCD);
    expect(verificationRes).to.be.false;
  }

  it("should not verify a proof with incorrect partialTicket claims", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToRevealAll,
      true /* withNullifier */,
      validEventIdsContainingTicket
    );
    const validPCD = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.ticketId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.eventId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.productId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.timestampConsumed = 123;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.timestampSigned = 123;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeSemaphoreId = "123";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.isConsumed = !claim.partialTicket.isConsumed;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.isRevoked = !claim.partialTicket.isRevoked;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.ticketCategory = TicketCategory.PcdWorkingGroup;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeEmail = "wrongemail@example.com";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeName = "Some person who doesn't exist";
    });
  });

  it("should not verify a proof with incorrectly revealed partialTicket claims", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToRevealNone,
      true /* withNullifier */,
      validEventIdsContainingTicket
    );
    const validPCD = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.ticketId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.eventId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.productId = uuid();
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.timestampConsumed = 123;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.timestampSigned = 123;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeSemaphoreId = "123";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.isConsumed = false;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.isRevoked = false;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.ticketCategory = TicketCategory.PcdWorkingGroup;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeEmail = "incorrect@example.com";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.partialTicket.attendeeName = "Incorrect name";
    });
  });

  it("should not verify a proof with incorrect non-ticket claims", async function () {
    const pcdArgs = await toArgs(
      ticketData1,
      fieldsToRevealNone,
      true /* withNullifier */,
      validEventIdsContainingTicket
    );
    const validPCD = await ZKEdDSAEventTicketPCDPackage.prove(pcdArgs);

    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.watermark = "111";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.signer[0] = "123";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.signer[1] = "123";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.validEventIds = validEventIdsNoTicket;
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.externalNullifier = "123";
    });
    await testVerifyBadClaim(validPCD, (claim: ZKEdDSAEventTicketPCDClaim) => {
      claim.nullifierHash = "123";
    });
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
