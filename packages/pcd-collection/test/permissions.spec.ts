import { ArgumentTypeName, PCDPackage } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";
import {
  AppendToFolderAction,
  AppendToFolderPermission,
  PCDActionType,
  PCDCollection,
  PCDPermissionType,
  ReplaceInFolderAction,
  ReplaceInFolderPermission
} from "../src";

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

describe("Permissions", async function () {
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage, RSAPCDPackage];
  const pcd = await newPCD();
  const serializedPcd = await RSAPCDPackage.serialize(pcd);

  it("appending should succeed with right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const permission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.true;
  });

  it("replacing should succeed with right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: ReplaceInFolderAction = {
      type: PCDActionType.ReplaceInFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const permission: ReplaceInFolderPermission = {
      type: PCDPermissionType.ReplaceInFolder,
      folder: "test"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.true;
  });

  it("appending should fail without right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const wrongFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "other"
    };

    expect(
      await collection.tryExecutingActionWithPermission(
        action,
        wrongFolderPermission
      )
    ).to.be.false;
  });

  it("replacing should fail without right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: ReplaceInFolderAction = {
      type: PCDActionType.ReplaceInFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const wrongFolderPermission = {
      type: PCDPermissionType.ReplaceInFolder,
      folder: "other"
    };

    expect(
      await collection.tryExecutingActionWithPermission(
        action,
        wrongFolderPermission
      )
    ).to.be.false;
  });

  it("appending should succeed for descendant folders", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test/sub/folder",
      pcds: []
    };

    const permission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.true;
  });

  it("replacing should succeed for descendant folders", async function () {
    const collection = new PCDCollection(packages);

    const action: ReplaceInFolderAction = {
      type: PCDActionType.ReplaceInFolder,
      folder: "test/sub/folder",
      pcds: []
    };

    const permission: ReplaceInFolderPermission = {
      type: PCDPermissionType.ReplaceInFolder,
      folder: "test"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.true;
  });

  it("appending should not succeed when permission is for ancestor folders", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: []
    };

    const permission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test/sub/folder"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.false;
  });

  it("replacing should not succeed when permission is for ancestor folders", async function () {
    const collection = new PCDCollection(packages);

    const action: ReplaceInFolderAction = {
      type: PCDActionType.ReplaceInFolder,
      folder: "test",
      pcds: []
    };

    const permission: ReplaceInFolderPermission = {
      type: PCDPermissionType.ReplaceInFolder,
      folder: "test/sub/folder"
    };

    expect(
      await collection.tryExecutingActionWithPermission(action, permission)
    ).to.be.false;
  });

  it("should not be possible to append the same PCD twice", async function () {
    const collection = new PCDCollection(packages);
    const pcd = await newPCD();
    const serializedPcd = await RSAPCDPackage.serialize(pcd);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const permission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test"
    };

    // Appending to an empty folder should work
    expect(await collection.tryExec(action, [permission])).to.be.true;
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);

    // Appending the same PCD again should fail
    expect(await collection.tryExec(action, [permission])).to.be.false;
    // Should still be only one PCD in the folder
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);

    const otherfolderAction: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test/subfolder",
      pcds: [serializedPcd]
    };

    const otherfolderPermission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test/subfolder"
    };

    // Appending to a different folder should fail too
    expect(await collection.tryExec(otherfolderAction, [otherfolderPermission]))
      .to.be.false;
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);
  });

  it("should be possible to replace the same PCD but only in the same folder", async function () {
    const collection = new PCDCollection(packages);
    const pcd = await newPCD();
    const serializedPcd = await RSAPCDPackage.serialize(pcd);

    const action: ReplaceInFolderAction = {
      type: PCDActionType.ReplaceInFolder,
      folder: "test",
      pcds: [serializedPcd]
    };

    const permission: ReplaceInFolderPermission = {
      type: PCDPermissionType.ReplaceInFolder,
      folder: "test"
    };

    // Appending to an empty folder should work
    expect(await collection.tryExec(action, [permission])).to.be.true;
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);

    // Replacing the same PCD again should work
    expect(await collection.tryExec(action, [permission])).to.be.true;
    // Should still be only one PCD in the folder
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);

    const otherfolderAction: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test/subfolder",
      pcds: [serializedPcd]
    };

    const otherfolderPermission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test/subfolder"
    };

    // Replacing to a different folder should fail
    expect(await collection.tryExec(otherfolderAction, [otherfolderPermission]))
      .to.be.false;
    expect(collection.getAllPCDsInFolder("test").length).to.eq(1);
  });
});
