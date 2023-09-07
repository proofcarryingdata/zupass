import {
  AppendToFolderAction,
  AppendToFolderPermission,
  PCDActionType,
  PCDPermissionType
} from "@pcd/pcd-collection";

describe("File System", async function () {
  it("executing actions from a feed should work", async function () {
    const action: AppendToFolderAction = {
      type: PCDActionType.AppendToFolder,
      folder: "test",
      pcds: []
    };

    const permission: AppendToFolderPermission = {
      type: PCDPermissionType.AppendToFolder,
      folder: "test"
    };
  });
});
