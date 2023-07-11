import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { RSAPCD, RSAPCDPackage } from "../src";

describe("RSA signature PCD should work", function () {
  this.timeout(1000 * 30);

  const key = new NodeRSA({ b: 2048 });
  const exportedKey = key.exportKey("private");
  const message = "message to sign";
  let pcd: RSAPCD;

  this.beforeAll(async () => {
    pcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: exportedKey,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: message,
      },
    });
  });

  it("should be able to prove and verify with valid arguments", async function () {
    const isValid = await RSAPCDPackage.verify(pcd);
    expect(isValid).to.eq(true);
  });

  it("should be able to serialize and deserialize", async function () {
    const serialized = await RSAPCDPackage.serialize(pcd);
    const deserialized = await RSAPCDPackage.deserialize(serialized.pcd);
    const deserializedValid = await RSAPCDPackage.verify(deserialized);
    expect(deserializedValid).to.eq(true);
    expect(pcd).to.deep.eq(deserialized);
  });
});
