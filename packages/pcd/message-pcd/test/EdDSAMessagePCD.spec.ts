import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import { EdDSAMessagePCDPackage } from "../src";

describe("message-pcd should work", function () {
  this.timeout(30_000);

  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const prvKey =
    "0001020304050607080900010203040506070809000102030405060708090001";

  const expectedPublicKey = [
    "1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2",
    "1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4"
  ];

  it("should work", async function () {
    const testTitle = "test title";
    const testMessage = "message";

    const pcd = await EdDSAMessagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: prvKey
      },
      title: {
        argumentType: ArgumentTypeName.String,
        value: testTitle
      },
      markdown: {
        argumentType: ArgumentTypeName.String,
        value: testMessage
      }
    });

    expect(await EdDSAMessagePCDPackage.verify(pcd)).to.eq(true);
  });
});
