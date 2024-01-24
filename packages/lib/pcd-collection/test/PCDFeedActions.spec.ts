import { ArgumentTypeName, PCDPackage } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import {
  PCDAction,
  PCDActionType,
  PCDCollection,
  PCDPermission,
  PCDPermissionType
} from "../src";

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
      value: `signed message ${id}`
    }
  });

  return pcd;
}

describe("PCD Actions which simulate subscription feeds", async function () {
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage, RSAPCDPackage];
  const allPermissions: PCDPermission[] = [
    { type: PCDPermissionType.AppendToFolder, folder: "Test Folder 1" },
    { type: PCDPermissionType.DeleteFolder, folder: "Test Folder 1" },
    { type: PCDPermissionType.ReplaceInFolder, folder: "Test Folder 1" },
    { type: PCDPermissionType.AppendToFolder, folder: "Test Folder 2" },
    { type: PCDPermissionType.DeleteFolder, folder: "Test Folder 2" },
    { type: PCDPermissionType.ReplaceInFolder, folder: "Test Folder 2" }
  ];

  const collection = new PCDCollection(packages);

  const pcdList1 = await Promise.all([newPCD(), newPCD(), newPCD()]);
  const serializedPCDs1 = await Promise.all(
    pcdList1.map(RSAPCDPackage.serialize)
  );
  const pcdList2 = await Promise.all([newPCD(), newPCD(), newPCD()]);
  const serializedPCDs2 = await Promise.all(
    pcdList2.map(RSAPCDPackage.serialize)
  );

  const allPCDs = [...pcdList1, ...pcdList2];

  const actions: PCDAction[] = [
    {
      type: PCDActionType.DeleteFolder,
      folder: "Test Folder 1",
      recursive: false
    },
    {
      type: PCDActionType.ReplaceInFolder,
      folder: "Test Folder 1",
      pcds: serializedPCDs1
    },
    {
      type: PCDActionType.DeleteFolder,
      folder: "Test Folder 2",
      recursive: false
    },
    {
      type: PCDActionType.ReplaceInFolder,
      folder: "Test Folder 2",
      pcds: serializedPCDs2
    }
  ];

  it("should execute properly", async function () {
    const hash = await collection.getHash();

    for (const action of actions) {
      expect(await collection.tryExec(action, allPermissions)).to.be.true;
    }

    expect(collection.getAll()).to.deep.eq(allPCDs);

    const hashAfterActions = await collection.getHash();
    expect(hashAfterActions).to.not.eq(hash);
  });

  it("should be idempotent", async function () {
    const hashAfterActions1 = await collection.getHash();

    for (const action of actions) {
      expect(await collection.tryExec(action, allPermissions)).to.be.true;
    }

    expect(collection.getAll()).to.deep.eq(allPCDs);

    const hashAfterActions2 = await collection.getHash();
    expect(hashAfterActions2).to.eq(hashAfterActions1);
  });
});
