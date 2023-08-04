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

describe("PCDCollection", async function () {
  this.timeout(30 * 1000);

  const packages = [RSAPCDPackage];

  it("Should let you manage folders", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);

    const folder1 = "FOLDER_1";
    const folder2 = "FOLDER_2";
    const folder3 = "FOLDER_3";

    collection.setFolder(pcdList[0].id, folder1);
    collection.setFolder(pcdList[3].id, folder1);
    expect(collection.getAllFolderNames()).to.deep.eq([folder1]);

    collection.setFolder(pcdList[1].id, folder2);
    collection.setFolder(pcdList[4].id, folder2);
    expect(collection.getAllFolderNames()).to.deep.eq([folder1, folder2]);

    collection.setFolder(pcdList[2].id, folder3);
    collection.setFolder(pcdList[5].id, folder3);
    expect(collection.getAllFolderNames()).to.deep.eq([
      folder1,
      folder2,
      folder3
    ]);

    expect(collection.getFolder(pcdList[0].id)).to.eq(folder1);
    expect(collection.getFolder(pcdList[1].id)).to.eq(folder2);
    expect(collection.getFolder(pcdList[2].id)).to.eq(folder3);
    expect(collection.getFolder(pcdList[3].id)).to.eq(folder1);
    expect(collection.getFolder(pcdList[4].id)).to.eq(folder2);
    expect(collection.getFolder(pcdList[5].id)).to.eq(folder3);

    const serialized = await collection.serializeCollection();
    const deserialized = await PCDCollection.deserialize(packages, serialized);

    expect(deserialized.getFolder(pcdList[0].id)).to.eq(folder1);
    expect(deserialized.getFolder(pcdList[1].id)).to.eq(folder2);
    expect(deserialized.getFolder(pcdList[2].id)).to.eq(folder3);
    expect(deserialized.getFolder(pcdList[3].id)).to.eq(folder1);
    expect(deserialized.getFolder(pcdList[4].id)).to.eq(folder2);
    expect(deserialized.getFolder(pcdList[5].id)).to.eq(folder3);

    expect(deserialized.getAllFolderNames()).to.deep.eq([
      folder1,
      folder2,
      folder3
    ]);

    expect(deserialized.getAllInFolder(folder1)).to.deep.eq([
      pcdList[0],
      pcdList[3]
    ]);
    expect(deserialized.getAllInFolder(folder2)).to.deep.eq([
      pcdList[1],
      pcdList[4]
    ]);
    expect(deserialized.getAllInFolder(folder3)).to.deep.eq([
      pcdList[2],
      pcdList[5]
    ]);
    expect(deserialized.getAll()).to.deep.eq([
      pcdList[0],
      pcdList[1],
      pcdList[2],
      pcdList[3],
      pcdList[4],
      pcdList[5]
    ]);

    deserialized.removeAllInFolder(folder1);
    expect(deserialized.getAllFolderNames()).to.deep.eq([folder2, folder3]);
    expect(deserialized.getAll().length).to.eq(4);

    expect(deserialized.getAll()).to.deep.contain(pcdList[1]);
    expect(deserialized.getAll()).to.deep.contain(pcdList[4]);
    expect(deserialized.getAll()).to.deep.contain(pcdList[2]);
    expect(deserialized.getAll()).to.deep.contain(pcdList[5]);
  });

  it("Should be able to deserialize three unique PCDs properly", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);

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

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);

    expect(() => {
      collection.add(pcdList[0]);
    }).to.throw();
  });

  it("Should let you add a PCD with the same id if config.upsert = true", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);

    const hash = collection.getHash();

    const replacement = await newPCD(pcdList[0].id);

    collection.add(replacement, { upsert: true });

    expect(collection.getAll()).to.deep.eq([
      replacement,
      pcdList[1],
      pcdList[2]
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

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);
    const hash = collection.getHash();

    collection.remove(pcdList[0].id);

    expect(collection.getAll()).to.deep.eq([pcdList[1], pcdList[2]]);
    const hashAfterEdit = collection.getHash();

    expect(hashAfterEdit).to.not.eq(hash);
  });
});
