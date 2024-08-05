import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "../src/index.js";

describe("EdDSA ticket should work", function () {
  let ticket: EdDSATicketPCD;

  this.beforeAll(async () => {
    await EdDSATicketPCDPackage.init?.({});

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
      isRevoked: false,
      ticketCategory: TicketCategory.Devconnect
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

  it("should not be possible to verify a ticket that has been tampered with", async function () {
    const originalTicketData = ticket.claim.ticket;
    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeEmail: "hacker@example.com"
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeName: "Not The Ticket Holder"
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, eventId: uuid() };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, productId: uuid() };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, ticketId: uuid() };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      attendeeSemaphoreId: "54321"
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, isConsumed: true };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = { ...originalTicketData, isRevoked: true };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      timestampConsumed: 0
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      timestampSigned: 0
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    ticket.claim.ticket = {
      ...originalTicketData,
      ticketCategory: TicketCategory.PcdWorkingGroup
    };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.false;

    // Just to show that the original data definitely still works
    ticket.claim.ticket = { ...originalTicketData };
    expect(await EdDSATicketPCDPackage.verify(ticket)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EdDSATicketPCDPackage.serialize(ticket);
    const deserialized = await EdDSATicketPCDPackage.deserialize(
      serialized.pcd
    );
    expect(deserialized).to.deep.eq(ticket);
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"eddsa-ticket-pcd","pcd":"{\\"id\\":\\"4bd9af8b-fdd5-46d8-857e-e8fd3a435a2b\\",\\"eddsaPCD\\":{\\"type\\":\\"eddsa-pcd\\",\\"pcd\\":\\"{\\\\\\"type\\\\\\":\\\\\\"eddsa-pcd\\\\\\",\\\\\\"id\\\\\\":\\\\\\"bcc8f3e9-4eb3-4971-a4c3-b82760c31771\\\\\\",\\\\\\"claim\\\\\\":{\\\\\\"message\\\\\\":[\\\\\\"e99ca2887d3b40e1a3ba2d65805ffbb0\\\\\\",\\\\\\"aa10fb635efd4f9db5b67d891551793f\\\\\\",\\\\\\"886bcf59e9d54c35befb22ecb242f7c5\\\\\\",\\\\\\"18d866c3a37\\\\\\",\\\\\\"18d866c3a37\\\\\\",\\\\\\"3039\\\\\\",\\\\\\"0\\\\\\",\\\\\\"0\\\\\\",\\\\\\"1\\\\\\",\\\\\\"f02f61d33aac1c8d56813d668299b33d05aa99adf2056c1950f688459da1a4\\\\\\",\\\\\\"1ef4e838a9aa1a80dcc2a3af4fd57190f8a91c3bf373c85142f2941687ebf1\\\\\\",\\\\\\"0\\\\\\"],\\\\\\"publicKey\\\\\\":[\\\\\\"1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2\\\\\\",\\\\\\"1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4\\\\\\"]},\\\\\\"proof\\\\\\":{\\\\\\"signature\\\\\\":\\\\\\"6537d0e06470025228169023683a666e5e4398d9cf4c4d601d8267a295f0441607876c4189ddd662aa5e26adcdff11ae355f12214c024e55d1390a63e7fcb504\\\\\\"}}\\"},\\"ticket\\":{\\"attendeeName\\":\\"test name\\",\\"attendeeEmail\\":\\"user@test.com\\",\\"eventName\\":\\"event\\",\\"ticketName\\":\\"ticket\\",\\"checkerEmail\\":\\"checker@test.com\\",\\"ticketId\\":\\"e99ca288-7d3b-40e1-a3ba-2d65805ffbb0\\",\\"eventId\\":\\"aa10fb63-5efd-4f9d-b5b6-7d891551793f\\",\\"productId\\":\\"886bcf59-e9d5-4c35-befb-22ecb242f7c5\\",\\"timestampConsumed\\":1707357256247,\\"timestampSigned\\":1707357256247,\\"attendeeSemaphoreId\\":\\"12345\\",\\"isConsumed\\":false,\\"isRevoked\\":false,\\"ticketCategory\\":1}}"}';
    const expectedTicket: ITicketData = {
      // the fields below are not signed and are used for display purposes

      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",

      // the fields below are signed using the server's private eddsa key

      ticketId: "e99ca288-7d3b-40e1-a3ba-2d65805ffbb0",
      eventId: "aa10fb63-5efd-4f9d-b5b6-7d891551793f",
      productId: "886bcf59-e9d5-4c35-befb-22ecb242f7c5",
      timestampConsumed: 1707357256247,
      timestampSigned: 1707357256247,
      attendeeSemaphoreId: "12345",
      isConsumed: false,
      isRevoked: false,
      ticketCategory: TicketCategory.Devconnect
    };
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(EdDSATicketPCDPackage.name);
    const deserialized = await EdDSATicketPCDPackage.deserialize(
      serialized.pcd
    );
    const deserializedValid = await EdDSATicketPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("4bd9af8b-fdd5-46d8-857e-e8fd3a435a2b");
    expect(deserialized.claim.ticket).to.deep.eq(expectedTicket);
  });
});
