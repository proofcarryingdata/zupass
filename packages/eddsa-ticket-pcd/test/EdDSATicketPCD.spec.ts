import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import { EdDSATicketPCD, EdDSATicketPCDPackage, ITicketData } from "../src";

describe("EdDSA ticket should work", function () {
  this.timeout(1000 * 30);

  let ticket: EdDSATicketPCD;

  this.beforeAll(async () => {
    await EdDSATicketPCDPackage.init!({});
    await EdDSAPCDPackage.init!({});

    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    const ticketData: ITicketData = {
      // the fields below are not signed and are used for display purposes

      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",

      // the fields below are signed using the server's private eddsa key

      ticketId: uuid(),
      eventId: uuid(),
      productId: uuid(),
      timestampConsumed: Date.now(),
      timestampSigned: Date.now(),
      attendeeSemaphoreId: "12345",
      isConsumed: false,
      isRevoked: false
    };

    ticket = await EdDSATicketPCDPackage.prove({
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
  });

  it("should be able to create and verify a signed ticket", async function () {
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EdDSATicketPCDPackage.serialize(ticket);
    const deserialized = await EdDSATicketPCDPackage.deserialize(
      serialized.pcd
    );
    expect(deserialized).to.deep.eq(ticket);
  });
});
