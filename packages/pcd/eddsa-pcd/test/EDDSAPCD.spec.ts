import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { EdDSAPCD, EdDSAPCDPackage, prove, verify } from "../src";

describe("eddsa-pcd should work", function () {
  let pcd: EdDSAPCD;

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
    expect(pcd.claim.message).to.deep.eq(message.map((s) => BigInt(s)));
    expect(pcd.claim.publicKey).to.deep.eq(expectedPublicKey);
  });

  it("should be able to serialize and deserialize a PCD", async function () {
    const serialized = await EdDSAPCDPackage.serialize(pcd);
    const deserialized = await EdDSAPCDPackage.deserialize(serialized.pcd);
    const deserializedValid = await EdDSAPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd).to.deep.eq(deserialized);
  });

  it("should be able to compatibly deserialize a saved PCD", async function () {
    // PCD serialized on 2024-02-08 by code of this test as of main commit 8478b75f5a
    const savedPCD =
      '{"type":"eddsa-pcd","pcd":"{\\"type\\":\\"eddsa-pcd\\",\\"id\\":\\"c921f6e8-3e3e-4ebc-ae7e-43293246eb23\\",\\"claim\\":{\\"message\\":[\\"12345\\",\\"54321\\",\\"deadbeef\\"],\\"publicKey\\":[\\"1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2\\",\\"1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4\\"]},\\"proof\\":{\\"signature\\":\\"39166dd6187378e2ef24d183bffe5bd1b2114344fcd5a56db562a12859c03b9a53b2f98de0b7d4f23dc49979d0e8f919f428a37e736163f7426259c13ecb7000\\"}}"}';
    const serialized = JSON.parse(savedPCD);
    expect(serialized.type).to.eq(EdDSAPCDPackage.name);
    const deserialized = await EdDSAPCDPackage.deserialize(serialized.pcd);
    const deserializedValid = await EdDSAPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(deserialized.id).to.eq("c921f6e8-3e3e-4ebc-ae7e-43293246eb23");
    expect(deserialized.claim.message).to.deep.eq(
      message.map((s) => BigInt(s))
    );
    expect(deserialized.claim.publicKey).to.deep.eq(expectedPublicKey);
  });
});
