import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODEntries } from "@pcd/pod";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import {
  PODTicketPCD,
  PODTicketPCDPackage,
  PODTicketPCDTypeName,
  TicketCategory,
  ticketToPOD
} from "../src";
import { IPODTicketData } from "../src/schema";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const expectedPublicKey = "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4";

describe("PODTicketPCD should work", function () {
  let ticket: PODTicketPCD;
  const expectedEntries: PODEntries = {
    attendeeEmail: { value: "user@test.com", type: "string" },
    attendeeName: { value: "test name", type: "string" },
    attendeeSemaphoreId: { value: 12345n, type: "cryptographic" },
    checkerEmail: { value: "checker@test.com", type: "string" },
    eventId: { value: "d451327c-9997-449a-a6fb-bea11e816533", type: "string" },
    eventName: { value: "event", type: "string" },
    isConsumed: { value: 0n, type: "int" },
    isRevoked: { value: 0n, type: "int" },
    owner: {
      value: "9x0qSqXus/VG4OgfyHWvVEFIiaTa7rsE/kS0YsHNNQI",
      type: "eddsa_pubkey"
    },
    pod_type: { value: "zupass.ticket", type: "string" },
    productId: {
      value: "a7c633a4-618a-474c-bb33-523ba68e6314",
      type: "string"
    },
    ticketCategory: { value: 1n, type: "int" },
    ticketId: { value: "0450fd86-fa6f-430b-81ac-24b03a75be01", type: "string" },
    ticketName: { value: "ticket", type: "string" },
    timestampConsumed: { value: 1731888000000n, type: "int" },
    timestampSigned: { value: 1731283200000n, type: "int" }
  };
  const expectedContentID: bigint =
    11517216062413867047008812556394794100107788701217748178688805496029498666504n;
  const expectedSignature: string =
    "1FEGe+t/MvyX86YTtIXypC2LMmOZMZ6JQ5tpjOqsmSRtUiCJqX2jVGb+VR1b2kEgVLtn3NvcVsUt45WwL1IhAg";
  const COMPAT_TEST_PCD_ID = "5bc68bb5-32bd-48cf-b891-774ae382ca73";

  this.beforeAll(async () => {
    const ticketData: IPODTicketData = {
      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",
      ticketId: "0450fd86-fa6f-430b-81ac-24b03a75be01",
      eventId: "d451327c-9997-449a-a6fb-bea11e816533",
      productId: "a7c633a4-618a-474c-bb33-523ba68e6314",
      timestampConsumed: Date.UTC(2024, 10, 18),
      timestampSigned: Date.UTC(2024, 10, 11),
      attendeeSemaphoreId: "12345",
      owner: "9x0qSqXus/VG4OgfyHWvVEFIiaTa7rsE/kS0YsHNNQI",
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
        value: COMPAT_TEST_PCD_ID,
        argumentType: ArgumentTypeName.String
      }
    });
  });

  it("should be able to create and verify a signed ticket", async function () {
    expect(await PODTicketPCDPackage.verify(ticket)).to.be.true;
    expect(ticket.type).to.eq(PODTicketPCDTypeName);
    expect(ticket.id).to.eq(COMPAT_TEST_PCD_ID);
  });

  it("should be represented as a POD with the expected values", async function () {
    const ticketPOD = ticketToPOD(ticket);
    expect(ticketPOD.verifySignature()).to.be.true;
    expect(ticketPOD.content.asEntries()).to.deep.eq(expectedEntries);
    expect(ticketPOD.contentID).to.eq(expectedContentID);
    expect(ticketPOD.signature).to.eq(expectedSignature);
    expect(ticketPOD.signerPublicKey).to.eq(expectedPublicKey);
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

  it("should properly deserialize and verify a previously-serialized PCD", async function () {
    // Serialized using PODTicketPCDPackage.serialize when pod_type was added.
    const FIXED_POD_TICKET_PCD =
      '{"type":"pod-ticket-pcd","pcd":"{\\"id\\":\\"5bc68bb5-32bd-48cf-b891-774ae382ca73\\",\\"claim\\":{\\"ticket\\":{\\"attendeeName\\":\\"test name\\",\\"attendeeEmail\\":\\"user@test.com\\",\\"eventName\\":\\"event\\",\\"ticketName\\":\\"ticket\\",\\"checkerEmail\\":\\"checker@test.com\\",\\"ticketId\\":\\"0450fd86-fa6f-430b-81ac-24b03a75be01\\",\\"eventId\\":\\"d451327c-9997-449a-a6fb-bea11e816533\\",\\"productId\\":\\"a7c633a4-618a-474c-bb33-523ba68e6314\\",\\"timestampConsumed\\":1731888000000,\\"timestampSigned\\":1731283200000,\\"attendeeSemaphoreId\\":\\"12345\\",\\"owner\\":\\"9x0qSqXus/VG4OgfyHWvVEFIiaTa7rsE/kS0YsHNNQI\\",\\"isConsumed\\":false,\\"isRevoked\\":false,\\"ticketCategory\\":1},\\"signerPublicKey\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"},\\"proof\\":{\\"signature\\":\\"1FEGe+t/MvyX86YTtIXypC2LMmOZMZ6JQ5tpjOqsmSRtUiCJqX2jVGb+VR1b2kEgVLtn3NvcVsUt45WwL1IhAg\\"}}"}';

    const serialized = JSON.parse(FIXED_POD_TICKET_PCD);
    expect(serialized.type).eq(PODTicketPCDTypeName);

    const deserialized = await PODTicketPCDPackage.deserialize(serialized.pcd);
    expect(await PODTicketPCDPackage.verify(deserialized)).to.be.true;
    expect(deserialized.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(deserialized.claim).to.deep.eq(ticket.claim);
    expect(deserialized.proof).to.deep.eq(ticket.proof);
  });

  it("should properly deserialize (but not verify) an old PCD with no pod-type)", async function () {
    // Serialized using PODTicketPCDPackage.serialize before pod_type was added.
    const FIXED_TYPELESS_POD_TICKET_PCD =
      '{"type":"pod-ticket-pcd","pcd":"{\\"id\\":\\"5bc68bb5-32bd-48cf-b891-774ae382ca73\\",\\"claim\\":{\\"ticket\\":{\\"attendeeName\\":\\"test name\\",\\"attendeeEmail\\":\\"user@test.com\\",\\"eventName\\":\\"event\\",\\"ticketName\\":\\"ticket\\",\\"checkerEmail\\":\\"checker@test.com\\",\\"ticketId\\":\\"0450fd86-fa6f-430b-81ac-24b03a75be01\\",\\"eventId\\":\\"d451327c-9997-449a-a6fb-bea11e816533\\",\\"productId\\":\\"a7c633a4-618a-474c-bb33-523ba68e6314\\",\\"timestampConsumed\\":1731888000000,\\"timestampSigned\\":1731283200000,\\"attendeeSemaphoreId\\":\\"12345\\",\\"owner\\":\\"9x0qSqXus/VG4OgfyHWvVEFIiaTa7rsE/kS0YsHNNQI\\",\\"isConsumed\\":false,\\"isRevoked\\":false,\\"ticketCategory\\":1},\\"signerPublicKey\\":\\"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4\\"},\\"proof\\":{\\"signature\\":\\"RD0+uScN/pg6s0KMDiEGy7H4czY/5YEudAWw/DVi/oipeKGmFwE+FuChZPqRkppmAp3hiHU/fF74VfCfuQugAQ\\"}}"}';

    const serialized = JSON.parse(FIXED_TYPELESS_POD_TICKET_PCD);
    expect(serialized.type).eq(PODTicketPCDTypeName);

    const deserialized = await PODTicketPCDPackage.deserialize(serialized.pcd);
    expect(await PODTicketPCDPackage.verify(deserialized)).to.be.false; // Expected failure!
    expect(deserialized.id).to.eq(COMPAT_TEST_PCD_ID);
    expect(deserialized.claim).to.deep.eq(ticket.claim);
    expect(deserialized.proof).to.deep.eq({
      signature:
        "RD0+uScN/pg6s0KMDiEGy7H4czY/5YEudAWw/DVi/oipeKGmFwE+FuChZPqRkppmAp3hiHU/fF74VfCfuQugAQ"
    });
  });
});
