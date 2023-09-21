import "mocha";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import { EdDSAPCD, EdDSAPCDPackage, prove, verify } from "../src";

describe("eddsa-pcd should work", function () {
  this.timeout(30_000);
  let pcd: EdDSAPCD;

  it("should be able to sign and verify using the PCD class", async function () {
    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    // Three parameters which represent bigints
    const message: string[] = ["0x12345", "0x54321", "0xdeadbeef"];

    pcd = await prove({
      message: {
        value: message,
        argumentType: ArgumentTypeName.StringArray
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

    expect(await verify(pcd)).to.be.true;
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await EdDSAPCDPackage.serialize(pcd);
    const deserialized = await EdDSAPCDPackage.deserialize(serialized.pcd);
    const deserializedValid = await EdDSAPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd).to.deep.eq(deserialized);
  });
});
