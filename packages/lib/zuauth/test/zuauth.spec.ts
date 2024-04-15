import { getEdDSAPublicKey, newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { assert, expect } from "chai";
import "mocha";
import * as path from "path";
import { v4 as uuid } from "uuid";
import { generateSnarkMessageHash } from "../../util/src/SNARKHelpers";
import { authenticate } from "../src/server";

async function makeTestTicket(
  privateKey: string,
  ticketData: ITicketData
): Promise<EdDSATicketPCD> {
  return EdDSATicketPCDPackage.prove({
    ticket: {
      value: ticketData,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: privateKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });
}

async function makeZKTicketPCD(
  ticketPCD: EdDSATicketPCD,
  identity: Identity,
  watermark: string
): Promise<ZKEdDSAEventTicketPCD> {
  const serializedTicketPCD = await EdDSATicketPCDPackage.serialize(ticketPCD);
  const serializedIdentityPCD = await SemaphoreIdentityPCDPackage.serialize(
    await SemaphoreIdentityPCDPackage.prove({
      identity
    })
  );

  return ZKEdDSAEventTicketPCDPackage.prove({
    ticket: {
      value: serializedTicketPCD,
      argumentType: ArgumentTypeName.PCD
    },
    identity: {
      value: serializedIdentityPCD,
      argumentType: ArgumentTypeName.PCD
    },
    fieldsToReveal: {
      value: {
        revealEventId: true,
        revealProductId: true
      },
      argumentType: ArgumentTypeName.ToggleList
    },
    validEventIds: {
      value: [ticketPCD.claim.ticket.eventId],
      argumentType: ArgumentTypeName.StringArray
    },
    externalNullifier: {
      value: undefined,
      argumentType: ArgumentTypeName.BigInt
    },
    watermark: {
      value: watermark,
      argumentType: ArgumentTypeName.BigInt
    }
  });
}

const identity = new Identity();

const testTicket: ITicketData = {
  eventId: uuid(),
  eventName: "Test event",
  productId: uuid(),
  ticketName: "Test product",
  ticketId: uuid(),
  ticketCategory: TicketCategory.Generic,
  checkerEmail: undefined,
  timestampConsumed: 0,
  timestampSigned: Date.now(),
  attendeeSemaphoreId: identity.getCommitment().toString(),
  isConsumed: false,
  isRevoked: false,
  attendeeEmail: "test@example.com",
  attendeeName: "Test Person"
};

describe("zuauth should work", async function () {
  const zkeyFilePath = path.join(
    __dirname,
    `../../../pcd/zk-eddsa-event-ticket-pcd/artifacts/circuit.zkey`
  );
  const wasmFilePath = path.join(
    __dirname,
    `../../../pcd/zk-eddsa-event-ticket-pcd/artifacts/circuit.wasm`
  );

  const privKey = newEdDSAPrivateKey();

  const watermark = generateSnarkMessageHash("watermark").toString();
  let zkPCD: ZKEdDSAEventTicketPCD;
  let serializedZKPCD: SerializedPCD<ZKEdDSAEventTicketPCD>;

  this.beforeAll(async () => {
    await EdDSATicketPCDPackage.init?.({});
    await ZKEdDSAEventTicketPCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
    });

    const ticketPCD = await makeTestTicket(privKey, testTicket);

    zkPCD = await makeZKTicketPCD(ticketPCD, identity, watermark);
    serializedZKPCD = await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);
  });

  it("should authenticate PCDs with correct settings", async function () {
    const publicKey = await getEdDSAPublicKey(privKey);

    const resultPCD = await authenticate(
      JSON.stringify(serializedZKPCD),
      watermark,
      [
        {
          eventId: testTicket.eventId,
          eventName: testTicket.eventName,
          productId: testTicket.productId,
          productName: testTicket.ticketName,
          pcdType: EdDSATicketPCDTypeName,
          publicKey
        }
      ]
    );

    expect(resultPCD.type).to.eq(ZKEdDSAEventTicketPCDTypeName);
    expect(resultPCD.claim.partialTicket.eventId).to.eq(testTicket.eventId);
    expect(resultPCD.claim.partialTicket.productId).to.eq(testTicket.productId);
  });

  it("should not authenticate PCDs with the wrong public key", async function () {
    const newPrivKey = newEdDSAPrivateKey();
    const publicKey = await getEdDSAPublicKey(newPrivKey);

    try {
      await authenticate(JSON.stringify(serializedZKPCD), watermark, [
        {
          eventId: testTicket.eventId,
          eventName: testTicket.eventName,
          productId: testTicket.productId,
          productName: testTicket.ticketName,
          pcdType: EdDSATicketPCDTypeName,
          publicKey
        }
      ]);
      assert(false, "Should not reach this point due to exception");
    } catch (e) {
      expect(e).to.exist;
    }
  });

  it("should not authenticate PCDs with the wrong watermark", async function () {
    const publicKey = await getEdDSAPublicKey(privKey);
    const newWatermark = generateSnarkMessageHash("new watermark").toString();

    try {
      await authenticate(JSON.stringify(serializedZKPCD), newWatermark, [
        {
          eventId: testTicket.eventId,
          eventName: testTicket.eventName,
          productId: testTicket.productId,
          productName: testTicket.ticketName,
          pcdType: EdDSATicketPCDTypeName,
          publicKey
        }
      ]);
      assert(false, "Should not reach this point due to exception");
    } catch (e) {
      expect(e).to.exist;
    }
  });

  it("should not authenticate PCDs with the wrong event ID", async function () {
    const publicKey = await getEdDSAPublicKey(privKey);

    try {
      await authenticate(JSON.stringify(serializedZKPCD), watermark, [
        {
          eventId: uuid(),
          eventName: testTicket.eventName,
          productId: testTicket.productId,
          productName: testTicket.ticketName,
          pcdType: EdDSATicketPCDTypeName,
          publicKey
        }
      ]);
      assert(false, "Should not reach this point due to exception");
    } catch (e) {
      expect(e).to.exist;
    }
  });

  it("should not authenticate PCDs with the wrong product ID", async function () {
    const publicKey = await getEdDSAPublicKey(privKey);

    try {
      await authenticate(JSON.stringify(serializedZKPCD), watermark, [
        {
          eventId: testTicket.eventId,
          eventName: testTicket.eventName,
          productId: uuid(),
          productName: testTicket.ticketName,
          pcdType: EdDSATicketPCDTypeName,
          publicKey
        }
      ]);
      assert(false, "Should not reach this point due to exception");
    } catch (e) {
      expect(e).to.exist;
    }
  });
});

// TODO:
//
// test URL construction?
