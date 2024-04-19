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
import { constructZkTicketProofUrl } from "../src/zuauth";

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

  it("should construct URLs for popup windows", async function () {
    const url = constructZkTicketProofUrl({
      config: [
        {
          pcdType: "eddsa-ticket-pcd",
          publicKey: [
            "1d47687549cb273b6fed3493de5a954920dd0403f8c7eb67c2ff72a26fa4ab62",
            "1144ef5d44e2d8972d7ade8138629ebefb094025ebb4df00ed02e22d9b68e665"
          ],
          eventId: "536c96f5-feb8-4938-bcac-47d4e13847c6",
          eventName: "Test event",
          productId: "9e39949c-b468-4c7e-a6a2-7735521f0bda",
          productName: "GA"
        }
      ],
      fieldsToReveal: {},
      watermark: "12345"
    });

    expect(url).to.eq(
      "https://zupass.org#/prove?request=%7B%22type%22%3A%22Get%22%2C%22returnUrl%22%3A%22%22%2C%22args%22%3A%7B%22ticket%22%3A%7B%22argumentType%22%3A%22PCD%22%2C%22pcdType%22%3A%22eddsa-ticket-pcd%22%2C%22userProvided%22%3Atrue%2C%22validatorParams%22%3A%7B%22eventIds%22%3A%5B%22536c96f5-feb8-4938-bcac-47d4e13847c6%22%5D%2C%22productIds%22%3A%5B%229e39949c-b468-4c7e-a6a2-7735521f0bda%22%5D%2C%22publicKeys%22%3A%5B%5B%221d47687549cb273b6fed3493de5a954920dd0403f8c7eb67c2ff72a26fa4ab62%22%2C%221144ef5d44e2d8972d7ade8138629ebefb094025ebb4df00ed02e22d9b68e665%22%5D%5D%2C%22notFoundMessage%22%3A%22No%20eligible%20PCDs%20found%22%7D%7D%2C%22identity%22%3A%7B%22argumentType%22%3A%22PCD%22%2C%22pcdType%22%3A%22semaphore-identity-pcd%22%2C%22userProvided%22%3Atrue%7D%2C%22validEventIds%22%3A%7B%22argumentType%22%3A%22StringArray%22%2C%22value%22%3A%5B%22536c96f5-feb8-4938-bcac-47d4e13847c6%22%5D%2C%22userProvided%22%3Afalse%7D%2C%22fieldsToReveal%22%3A%7B%22argumentType%22%3A%22ToggleList%22%2C%22value%22%3A%7B%7D%2C%22userProvided%22%3Afalse%7D%2C%22watermark%22%3A%7B%22argumentType%22%3A%22BigInt%22%2C%22value%22%3A%2212345%22%2C%22userProvided%22%3Afalse%7D%2C%22externalNullifier%22%3A%7B%22argumentType%22%3A%22BigInt%22%2C%22value%22%3A%2212345%22%2C%22userProvided%22%3Afalse%7D%7D%2C%22pcdType%22%3A%22zk-eddsa-event-ticket-pcd%22%2C%22options%22%3A%7B%22genericProveScreen%22%3Atrue%7D%2C%22postMessage%22%3Atrue%7D"
    );
  });

  it("should fail to construct URL with bad watermark", async function () {
    try {
      constructZkTicketProofUrl({
        config: [
          {
            pcdType: "eddsa-ticket-pcd",
            publicKey: [
              "1d47687549cb273b6fed3493de5a954920dd0403f8c7eb67c2ff72a26fa4ab62",
              "1144ef5d44e2d8972d7ade8138629ebefb094025ebb4df00ed02e22d9b68e665"
            ],
            eventId: "536c96f5-feb8-4938-bcac-47d4e13847c6",
            eventName: "Test event",
            productId: "9e39949c-b468-4c7e-a6a2-7735521f0bda",
            productName: "GA"
          }
        ],
        fieldsToReveal: {},
        watermark: "bad watermark"
      });
      assert(false, "Should not reach here due to thrown exception");
    } catch (e) {
      // Empty
    }
  });
});
