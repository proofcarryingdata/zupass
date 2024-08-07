import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import { RSAPCD, RSAPCDPackage } from "../src";

async function copyPcd(pcd: RSAPCD): Promise<RSAPCD> {
  return RSAPCDPackage.deserialize((await RSAPCDPackage.serialize(pcd)).pcd);
}

describe("RSA signature PCD should work", function () {
  const key = new NodeRSA({ b: 2048 });
  const exportedKey = key.exportKey("private");
  const message = "message to sign";
  let pcd: RSAPCD;

  this.beforeAll(async () => {
    pcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: exportedKey
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: message
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: undefined
      }
    });

    expect(await copyPcd(pcd)).to.deep.eq(pcd);
    expect(pcd.id).to.not.eq(undefined);
  });

  it("should be possible to set a custom id", async function () {
    const customId = "asdf-" + uuid();

    pcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: exportedKey
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: message
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: customId
      }
    });

    expect(pcd.id).to.eq(customId);
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

  it("should not verify a PCD that has been tampered with", async function () {
    const tamperedMessage = await copyPcd(pcd);
    tamperedMessage.claim.message += "a";
    expect(await RSAPCDPackage.verify(tamperedMessage)).to.eq(false);

    const tamperedSignature = await copyPcd(pcd);
    tamperedSignature.proof.signature = "a" + tamperedSignature.proof.signature;
    expect(await RSAPCDPackage.verify(tamperedSignature)).to.eq(false);

    const tamperedPubKey = await copyPcd(pcd);
    const lines = tamperedPubKey.proof.publicKey.split("\n");
    lines[1] = lines[1].substring(4);
    lines[1] += "asdf";
    tamperedPubKey.proof.publicKey = lines.join("\n");
    expect(await RSAPCDPackage.verify(tamperedPubKey)).to.eq(false);
  });
});
