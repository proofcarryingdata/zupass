import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { RSAPCDPackage } from "../src";

describe("RSA signature PCD should work", function () {
  this.timeout(1000 * 30);

  it("should verify with a valid signature", async function () {
    const key = new NodeRSA({ b: 2048 });
    const exportedKey = key.exportKey("private");
    const message = "message to sign";
    const pcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: exportedKey,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: message,
      },
    });
    const isValid = await RSAPCDPackage.verify(pcd);
    expect(isValid).to.eq(true);
  });
});
