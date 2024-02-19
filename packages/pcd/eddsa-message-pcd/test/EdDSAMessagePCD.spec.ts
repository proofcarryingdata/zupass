import { EdDSAPCD, prove, verify } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";

describe("eddsa-pcd should work", function () {
  this.timeout(30_000);

  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const prvKey =
    "0001020304050607080900010203040506070809000102030405060708090001";

  const expectedPublicKey = [
    "1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2",
    "1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4"
  ];

  // Three parameters which represent bigints
  const message: string[] = ["0x12345", "0x54321", "0xdeadbeef"];

  it("should be able to sign and verify using the PCD class", async function () {
    const pcd: EdDSAPCD = await prove({
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
    expect(pcd.claim.message).to.deep.eq(message.map((s) => BigInt(s)));
    expect(pcd.claim.publicKey).to.deep.eq(expectedPublicKey);
  });
});
