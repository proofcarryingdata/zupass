import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { RSAImagePCD, RSAImagePCDPackage } from "../src";

describe("RSA Image PCD should work", function () {
  this.timeout(1000 * 30);

  const key = new NodeRSA({ b: 2048 });
  const exportedKey = key.exportKey("private");
  const url = "test url";
  const title = "test title";

  let imagePCD: RSAImagePCD;

  this.beforeAll(async () => {
    imagePCD = await RSAImagePCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: undefined
      },
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: exportedKey
      },
      url: {
        argumentType: ArgumentTypeName.String,
        value: url
      },
      title: {
        argumentType: ArgumentTypeName.String,
        value: title
      }
    });
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await RSAImagePCDPackage.serialize(imagePCD);
    const deserialized = await RSAImagePCDPackage.deserialize(serialized.pcd);

    expect(imagePCD).to.deep.eq(deserialized);
  });
});
