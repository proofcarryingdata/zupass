import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { EdDSATicketPCDPackage, ITicketData } from "../src";

describe("EdDSA ticket should work", function () {
  this.timeout(1000 * 30);

  this.beforeAll(async () => {
    await EdDSATicketPCDPackage.init!({});
    await EdDSAPCDPackage.init!({});
  });

  it("should be possible to set a custom id", async function () {
    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    const testTicket: ITicketData = {
      attendeeEmail: "asdf"
    };

    const ticketPCD = await EdDSATicketPCDPackage.prove({
      ticket: {
        value: testTicket,
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

    expect(await EdDSATicketPCDPackage.verify(ticketPCD)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    //
  });
});
