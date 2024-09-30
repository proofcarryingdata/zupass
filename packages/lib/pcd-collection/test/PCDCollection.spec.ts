import {
  ArgumentTypeName,
  PCD,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import { RSAPCD, RSAPCDPackage, RSAPCDTypeName } from "@pcd/rsa-pcd";
import {
  UnknownPCD,
  UnknownPCDPackage,
  UnknownPCDTypeName,
  wrapUnknownPCD
} from "@pcd/unknown-pcd";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSpies from "chai-spies";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import { PCDCollection } from "../src";

chai.use(chaiSpies);
chai.use(chaiAsPromised);

async function newPCD(id?: string): Promise<RSAPCD> {
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

    collection.setPCDFolder(pcdList[0].id, folder1);
    collection.setPCDFolder(pcdList[3].id, folder1);
    collection.setPCDFolder(pcdList[1].id, folder2);
    collection.setPCDFolder(pcdList[4].id, folder2);
    collection.setPCDFolder(pcdList[2].id, folder3);
    collection.setPCDFolder(pcdList[5].id, folder3);

    expect(collection.getFolderOfPCD(pcdList[0].id)).to.eq(folder1);
    expect(collection.getFolderOfPCD(pcdList[1].id)).to.eq(folder2);
    expect(collection.getFolderOfPCD(pcdList[2].id)).to.eq(folder3);
    expect(collection.getFolderOfPCD(pcdList[3].id)).to.eq(folder1);
    expect(collection.getFolderOfPCD(pcdList[4].id)).to.eq(folder2);
    expect(collection.getFolderOfPCD(pcdList[5].id)).to.eq(folder3);

    const serialized = await collection.serializeCollection();
    const deserialized = await PCDCollection.deserialize(packages, serialized);

    expect(deserialized.getFolderOfPCD(pcdList[0].id)).to.eq(folder1);
    expect(deserialized.getFolderOfPCD(pcdList[1].id)).to.eq(folder2);
    expect(deserialized.getFolderOfPCD(pcdList[2].id)).to.eq(folder3);
    expect(deserialized.getFolderOfPCD(pcdList[3].id)).to.eq(folder1);
    expect(deserialized.getFolderOfPCD(pcdList[4].id)).to.eq(folder2);
    expect(deserialized.getFolderOfPCD(pcdList[5].id)).to.eq(folder3);

    expect(deserialized.getAllPCDsInFolder(folder1)).to.deep.eq([
      pcdList[0],
      pcdList[3]
    ]);
    expect(deserialized.getAllPCDsInFolder(folder2)).to.deep.eq([
      pcdList[1],
      pcdList[4]
    ]);
    expect(deserialized.getAllPCDsInFolder(folder3)).to.deep.eq([
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

    deserialized.removeAllPCDsInFolder(folder1);
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

    const hash = await collection.getHash();

    const replacement = await newPCD(pcdList[0].id);

    collection.add(replacement, { upsert: true });

    expect(collection.getAll()).to.deep.eq([
      replacement,
      pcdList[1],
      pcdList[2]
    ]);

    const hashAfterEdit = await collection.getHash();
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
    const hash = await collection.getHash();

    collection.remove(pcdList[0].id);

    expect(collection.getAll()).to.deep.eq([pcdList[1], pcdList[2]]);
    const hashAfterEdit = await collection.getHash();

    expect(hashAfterEdit).to.not.eq(hash);
  });

  it("should emit a change and have a new hash on mutation", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD(), newPCD()]);

    const serializedPCDs = await Promise.all(
      pcdList.map(RSAPCDPackage.serialize)
    );

    const collection = new PCDCollection(packages);
    await collection.deserializeAllAndAdd(serializedPCDs);
    // The deserializeAllAndAdd mutation has emitted a change, but it's
    // asynchronous and will end up caught inside the next waitForNewHash call.
    const firstHash = await waitForNewHash(collection);
    const anotherPcd = await newPCD();
    const secondhash = await waitForNewHash(collection, () => {
      collection.add(anotherPcd);
    });
    expect(secondhash).to.not.eq(firstHash);

    const thirdHash = await waitForNewHash(collection, () => {
      collection.remove(anotherPcd.id);
    });
    expect(secondhash).to.not.eq(thirdHash);
    expect(thirdHash).to.eq(firstHash);

    const fourthHash = await waitForNewHash(collection, () => {
      collection.setPCDFolder(pcdList[0].id, "folder");
    });
    expect(fourthHash).to.not.eq(firstHash);
  });

  it("should maintain hash across serialization", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    // Insertion order intentionally doesn't match order of IDs or folders.
    const collection = new PCDCollection(packages);
    collection.add(pcdList[0]);
    collection.setPCDFolder(pcdList[0].id, "3");
    collection.add(pcdList[1]);
    collection.setPCDFolder(pcdList[1].id, "1");
    collection.add(pcdList[2]);
    collection.setPCDFolder(pcdList[2].id, "AAAAA");
    collection.add(pcdList[3]);
    collection.setPCDFolder(pcdList[3].id, "AAAAA/BBBB");
    collection.add(pcdList[4]);
    // No folder for pcdList[4]

    const firstHash = await collection.getHash();

    const serializedCollection = await collection.serializeCollection();
    const deserializedCollection = await PCDCollection.deserialize(
      packages,
      serializedCollection
    );
    expect(await deserializedCollection.getHash()).to.eq(firstHash);
  });

  it("should merge two PCD collections", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    const firstCollection = new PCDCollection(packages);
    const secondCollection = new PCDCollection(packages);

    firstCollection.add(pcdList[0]);
    firstCollection.add(pcdList[1]);
    firstCollection.add(pcdList[2]);
    secondCollection.add(pcdList[3]);
    secondCollection.add(pcdList[4]);

    firstCollection.merge(secondCollection);

    expect(firstCollection.getAll()).to.deep.eq(pcdList);
  });

  it("should upsert PCDs with the same ID by default", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    const firstCollection = new PCDCollection(packages);
    const secondCollection = new PCDCollection(packages);

    firstCollection.add(pcdList[0]);
    firstCollection.add(pcdList[1]);
    firstCollection.add(pcdList[2]);
    firstCollection.add(pcdList[3]);
    firstCollection.add(pcdList[4]);
    secondCollection.add(pcdList[3]);
    secondCollection.add(pcdList[4]);

    firstCollection.merge(secondCollection);

    expect(firstCollection.getAll()).to.deep.eq(pcdList);
  });

  it("should filter out PCDs during merge", async function () {
    const pcdList = await Promise.all([
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD(),
      newPCD()
    ]);

    const firstCollection = new PCDCollection(packages);
    const secondCollection = new PCDCollection(packages);

    firstCollection.add(pcdList[0]);
    firstCollection.add(pcdList[1]);
    firstCollection.add(pcdList[2]);
    secondCollection.add(pcdList[3]);
    secondCollection.add(pcdList[4]);

    // secondCollection contains two PCDs, but we want to filter one of them
    // out.
    firstCollection.merge(secondCollection, {
      shouldInclude: (pcd) => {
        return pcd.id !== pcdList[4].id;
      }
    });

    expect(firstCollection.getAll()).to.deep.eq([
      pcdList[0],
      pcdList[1],
      pcdList[2],
      pcdList[3]
      // pcdList[4] should have been filtered out
    ]);
  });

  it("should copy folder details", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD()]);

    const firstCollection = new PCDCollection(packages);
    const secondCollection = new PCDCollection(packages);

    firstCollection.add(pcdList[0]);
    firstCollection.setPCDFolder(pcdList[0].id, "A");
    secondCollection.add(pcdList[1]);
    secondCollection.setPCDFolder(pcdList[1].id, "B");

    firstCollection.merge(secondCollection);

    expect(firstCollection.getAll()).to.deep.eq(pcdList);
    expect(firstCollection.getFolderOfPCD(pcdList[1].id)).to.eq("B");
  });

  it("should copy folder details when folder exists in both collections", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD()]);

    const firstCollection = new PCDCollection(packages);
    const secondCollection = new PCDCollection(packages);

    firstCollection.add(pcdList[0]);
    firstCollection.setPCDFolder(pcdList[0].id, "A");
    secondCollection.add(pcdList[1]);
    secondCollection.setPCDFolder(pcdList[1].id, "A");

    firstCollection.merge(secondCollection);

    expect(firstCollection.getAll()).to.deep.eq(pcdList);
    expect(firstCollection.getFolderOfPCD(pcdList[1].id)).to.eq("A");
  });

  async function testFallbackFunction(
    _collection: PCDCollection,
    _pcdPackage: PCDPackage | undefined,
    serializedPCD: SerializedPCD,
    deserializeError: unknown
  ): Promise<PCD> {
    return wrapUnknownPCD(serializedPCD, deserializeError);
  }

  it("should support deserialization fallback on missing package", async function () {
    // Good collection contains 1 RSAPCD
    const goodCollection = new PCDCollection([
      RSAPCDPackage,
      UnknownPCDPackage
    ]);
    goodCollection.add(await newPCD());
    const serializedGood = await goodCollection.serializeCollection();

    // Deserializing without RSAPCD package uses UnknownPCD fallback.
    await expect(
      PCDCollection.deserialize([UnknownPCDPackage], serializedGood)
    ).to.eventually.be.rejectedWith(Error, "no package matching rsa-pcd");
    const badCollection = await PCDCollection.deserialize(
      [UnknownPCDPackage],
      serializedGood,
      {
        fallbackDeserializeFunction: testFallbackFunction
      }
    );
    expect(badCollection.getAll()).has.length(1);
    const unknownPCD = badCollection.getAll()[0] as UnknownPCD;
    expect(unknownPCD.type).eq(UnknownPCDTypeName);
    expect(unknownPCD.claim.serializedPCD.type).eq(RSAPCDTypeName);

    // Round-trip serialization should return to the same good state
    const serializedBad = await badCollection.serializeCollection();
    expect(serializedBad).to.eq(serializedGood);

    // Good state should be deserializable with the right package.
    const recoveredCollection = await PCDCollection.deserialize(
      [RSAPCDPackage, UnknownPCDPackage],
      serializedBad
    );
    expect(recoveredCollection.getAll()).to.deep.eq(goodCollection.getAll());
  });

  it("should support deserialization fallback on unparsable PCD", async function () {
    // Good collection contains 1 RSAPCD
    const goodCollection = new PCDCollection([
      RSAPCDPackage,
      UnknownPCDPackage
    ]);
    goodCollection.add(await newPCD());
    const serializedGood = await goodCollection.serializeCollection();

    // Manually corrupt the serialized RSAPCD to force fallback.
    const serializedCorrupt = serializedGood.replace("claim", "clown");

    // Deserializing unparsable data uses UnknownPCD fallback.
    await expect(
      PCDCollection.deserialize(
        [RSAPCDPackage, UnknownPCDPackage],
        serializedCorrupt
      )
    ).to.eventually.be.rejectedWith(Error, "claim must be defined");
    const badCollection = await PCDCollection.deserialize(
      [RSAPCDPackage, UnknownPCDPackage],
      serializedCorrupt,
      {
        fallbackDeserializeFunction: testFallbackFunction
      }
    );
    expect(badCollection.getAll()).has.length(1);
    const unknownPCD = badCollection.getAll()[0] as UnknownPCD;
    expect(unknownPCD.type).eq(UnknownPCDTypeName);
    expect(unknownPCD.claim.serializedPCD.type).eq(RSAPCDTypeName);

    // Round-trip serialization should return to the same corrupt state
    // allowing for a retry in a future version of code.
    const serializedBad = await badCollection.serializeCollection();
    expect(serializedBad).to.eq(serializedCorrupt);
  });
});

function waitForNewHash(
  collection: PCDCollection,
  mutation?: () => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = collection.changeEmitter.listen(() => {
      unsubscribe();
      collection
        .getHash()
        .then((newHash) => resolve(newHash))
        .catch((e) => reject(e));
    });
    mutation && mutation();
  });
}
