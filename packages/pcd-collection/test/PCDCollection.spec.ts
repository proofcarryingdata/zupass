import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
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

    expect(collection.size()).to.eq(3);
    expect(collection.getAll()).to.deep.eq(pcdList);
    expect(collection.getAllIds()).to.deep.eq(pcdList.map(({ id }) => id));
    expect(collection.getById(pcdList[0].id)).to.deep.eq(pcdList[0]);
    expect(collection.getPCDsByType(RSAPCDPackage.name)).to.deep.eq(pcdList);
    pcdList.forEach(({ id }) =>
      expect(collection.hasPCDWithId(id)).to.eq(true)
    );
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

    const hash = collection.getHash();

    const replacement = await newPCD(pcdList[0].id);

    collection.add(replacement, { upsert: true });

    expect(collection.getAll()).to.deep.eq([
      replacement,
      pcdList[1],
      pcdList[2],
    ]);

    const hashAfterEdit = collection.getHash();
    expect(hashAfterEdit).to.not.eq(hash);
  });

  it("should let you find package by name", async function () {
    const collection = new PCDCollection(packages);
    expect(collection.getPackage(RSAPCDPackage.name)).to.eq(RSAPCDPackage);
    expect(collection.getPackage(RSAPCDPackage.name + "asdf")).to.eq(undefined);
    expect(collection.hasPackage(RSAPCDPackage.name)).to.eq(true);
    expect(collection.hasPackage(RSAPCDPackage.name + "asdf")).to.eq(false);
  });

  it("should let you serialize/deserialize a pcd", async function () {
    const collection = new PCDCollection(packages);
    const pcd = await newPCD();

    const serialized = await collection.serialize(pcd);
    const deserialized = await collection.deserialize(serialized);

    expect(pcd).to.deep.eq(deserialized);
  });

  it("should let you remove a pcd", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = await PCDCollection.deserialize(
      packages,
      serializedPCDs
    );
    const hash = collection.getHash();

    collection.remove(pcdList[0].id);

    expect(collection.getAll()).to.deep.eq([pcdList[1], pcdList[2]]);
    const hashAfterEdit = collection.getHash();

    expect(hashAfterEdit).to.not.eq(hash);
  });
});
