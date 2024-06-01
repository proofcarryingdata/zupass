import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import { PODTicketPCD, PODTicketPCDPackage, TicketCategory } from "../src";
import { IPODTicketData } from "../src/schema";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const expectedPublicKey = "xDP3ppa3qjpSJO-zmTuvDM2eku7O4MKaP2yCCKnoHZ4";

describe("PODTicketPCD should work", function () {
  let ticket: PODTicketPCD;

  this.beforeAll(async () => {
    const ticketData: IPODTicketData = {
      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",
      ticketId: uuid(),
      eventId: uuid(),
      productId: uuid(),
      timestampConsumed: Date.now(),
      timestampSigned: Date.now(),
      attendeeSemaphoreId: "12345",
      isConsumed: false,
      isRevoked: false,
      ticketCategory: TicketCategory.Devconnect
    };

    ticket = await PODTicketPCDPackage.prove({
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
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.true;
  });

  it("should not be possible to verify a ticket that has been tampered with", async function () {
    const originalTicketData = ticket.claim.ticket;
    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeEmail: "hacker@example.com"
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeName: "Not The Ticket Holder"
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, eventId: uuid() };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, productId: uuid() };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, ticketId: uuid() };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeSemaphoreId: "54321"
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, isConsumed: true };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, isRevoked: true };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      timestampConsumed: 0
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      timestampSigned: 0
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      ticketCategory: TicketCategory.PcdWorkingGroup
    };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.false;

    // Just to show that the original data definitely still works
    ticket.claim.ticket = { ...originalTicketData };
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await PODTicketPCDPackage.serialize(ticket);
    const deserialized = await PODTicketPCDPackage.deserialize(serialized.pcd);
    expect(deserialized.claim).to.deep.eq(ticket.claim);
    expect(deserialized.proof).to.deep.eq(deserialized.proof);
    expect(deserialized.type).to.eq(deserialized.type);
    expect(deserialized.id).to.eq(deserialized.id);
  });

  // @todo test deserialization of a hard-coded serialized PCD, to catch
  // incompatibilities introduced by changes to de/serialization.
});
