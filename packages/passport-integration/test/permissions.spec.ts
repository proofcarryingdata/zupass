import {
  AppendToFolderAction,
  AppendToFolderPermission,
  PCDActionType,
  PCDCollection,
  PCDPermissionType
} from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { expect } from "chai";

describe("Permissions", async function () {
  const packages: PCDPackage[] = [SemaphoreIdentityPCDPackage];

  it("executing actions should succeed with right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
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

  it("executing actions should fail without right permission", async function () {
    const collection = new PCDCollection(packages);

    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: []
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

  it("executing actions should succeed for descendant folders", async function () {
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

  it("executing actions should not succeed when permission is for ancestor folders", async function () {
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
});
