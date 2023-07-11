import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAPCD, RSAPCDPackage } from "@pcd/rsa-pcd";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import { PCDCollection } from "../src";

async function newPCD(id?: string) {
  id = id ?? uuid();
  const pkey = new NodeRSA({ b: 512 });

  const pcd = await RSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id,
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: pkey.exportKey("private"),
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "signed message",
    },
  });

  return pcd;
}

async function copyPcd(pcd: RSAPCD) {
  return await RSAPCDPackage.deserialize(
    (
      await RSAPCDPackage.serialize(pcd)
    ).pcd
  );
}

describe("PCDCollection", async function () {
  this.timeout(30 * 1000);

  const packages = [RSAPCDPackage];

  it("Should be able to deserialize three unique PCDs properly", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = await PCDCollection.deserialize(
      packages,
      serializedPCDs
    );

    expect(collection.getAll()).to.deep.eq(pcdList);
  });

  it("Should error if you try to add a PCD with the same id", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = await PCDCollection.deserialize(
      packages,
      serializedPCDs
    );

    expect(() => {
      collection.add(pcdList[0]);
    }).to.throw();
  });

  it("Should let you add a PCD with the same id if config.upsert = true", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = await PCDCollection.deserialize(
      packages,
      serializedPCDs
    );

    const replacement = await newPCD(pcdList[0].id);

    collection.add(replacement, { upsert: true });

    expect(collection.getAll()).to.deep.eq([
      replacement,
      pcdList[1],
      pcdList[2],
    ]);
  });
});
