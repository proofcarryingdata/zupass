import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { v4 as uuid } from "uuid";
import { MessagePCDPackage } from "../src/index.js";
import { checkMsg } from "../src/utils/checkMsg.js";

chai.use(chaiAsPromised);

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

const expectedPublicKey: EdDSAPublicKey = [
  "1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2",
  "1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4"
];

describe("message-pcd should work", function () {
  it("should work", async function () {
    const testTitle = "test title";
    const testMessage = "message";

    const pcd = await MessagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: uuid()
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: prvKey
      },
      message: {
        argumentType: ArgumentTypeName.Object,
        value: {
          displayName: testTitle,
          mdBody: testMessage
        }
      }
    });
    const ser = await MessagePCDPackage.serialize(pcd);

    expect(await MessagePCDPackage.verify(pcd)).to.eq(true);
    expect(async () => await checkMsg(pcd, expectedPublicKey)).to.not.throw();

    const copy1 = await MessagePCDPackage.deserialize(ser.pcd);

    ///////////////////////////////// tamper case 1 - make signature not match msg body
    /////////////////////////////////
    expect(pcd).to.deep.eq(copy1);
    expect(await MessagePCDPackage.verify(copy1)).to.eq(true);
    copy1.proof.signature.claim.message[0]++;
    expect(await MessagePCDPackage.verify(copy1)).to.eq(false);
    await expect(
      checkMsg(copy1, expectedPublicKey)
    ).to.eventually.be.rejectedWith(Error);

    ///////////////////////////////// tamper case 2 - change claim
    /////////////////////////////////
    const copy2 = await MessagePCDPackage.deserialize(ser.pcd);
    expect(true).to.eq(await MessagePCDPackage.verify(copy2));
    copy2.claim.mdBody = "XD";
    expect(false).to.eq(await MessagePCDPackage.verify(copy2));
    await expect(
      checkMsg(copy2, expectedPublicKey)
    ).to.eventually.be.rejectedWith(Error);

    ///////////////////////////////// tamper case 3 - change public key
    /////////////////////////////////
    const copy3 = await MessagePCDPackage.deserialize(ser.pcd);
    expect(true).to.eq(await MessagePCDPackage.verify(copy3));
    copy3.proof.signature.claim.publicKey[0] += "1";
    expect(false).to.eq(await MessagePCDPackage.verify(copy3));
    await expect(
      checkMsg(copy3, expectedPublicKey)
    ).to.eventually.be.rejectedWith(Error);
  });
});
