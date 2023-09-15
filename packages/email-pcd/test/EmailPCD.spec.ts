import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { EmailPCD, EmailPCDPackage } from "../src";

describe("EdDSA attested email should work", function () {
  this.timeout(1000 * 30);

  let emailPCD: EmailPCD;

  this.beforeAll(async () => {
    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    const emailAddress = "user@test.com";

    emailPCD = await EmailPCDPackage.prove({
      emailAddress: {
        value: emailAddress,
        argumentType: ArgumentTypeName.String
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

  it("should be able to create and verify a signed email", async function () {
    expect(await EmailPCDPackage.verify(emailPCD)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EmailPCDPackage.serialize(emailPCD);
    const deserialized = await EmailPCDPackage.deserialize(serialized.pcd);
    expect(deserialized).to.deep.eq(emailPCD);
  });
});
