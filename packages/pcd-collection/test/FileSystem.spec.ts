import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import chai, { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";

import chaiSpies from "chai-spies";
import { PCDFileSystem } from "../src/PCDFileSystem";
import { PCDPackages } from "../src/PCDPackages";

chai.use(chaiSpies);

async function newPCD(id?: string) {
  id = id ?? uuid();
  const pkey = new NodeRSA({ b: 512 });

  const pcd = await RSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: pkey.exportKey("private")
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "signed message"
    }
  });

  return pcd;
}

describe.only("PCD File System", async function () {
  this.timeout(30 * 1000);

  const packages = [RSAPCDPackage];

  it("should let you manage a file system", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    const fs = new PCDFileSystem(new PCDPackages(packages));

    console.log(fs);

    expect(1).to.eq(1);
  });
});
