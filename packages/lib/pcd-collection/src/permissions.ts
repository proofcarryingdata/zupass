// This enum should never overlap with PCDActionType
// See test "hould not allow action types to be assigned to permission
// types or vice-versa" in permissions.spec.ts
export const PCDPermissionType = {
  ReplaceInFolder: "ReplaceInFolder_permission",
  AppendToFolder: "AppendToFolder_permission",
  DeleteFolder: "DeleteFolder_permission"
} as const;

export type PCDPermission = PCDFolderPermission;

export type PCDFolderPermission =
  | AppendToFolderPermission
  | ReplaceInFolderPermission
  | DeleteFolderPermission;

export interface AppendToFolderPermission {
  type: typeof PCDPermissionType.AppendToFolder;
  folder: string;
}

export interface ReplaceInFolderPermission {
  type: typeof PCDPermissionType.ReplaceInFolder;
  folder: string;
}

export interface DeleteFolderPermission {
  type: typeof PCDPermissionType.DeleteFolder;
  folder: string;
}

export function isPCDFolderPermission(
  permission: PCDPermission
): permission is PCDFolderPermission {
  return [
    PCDPermissionType.AppendToFolder,
    PCDPermissionType.ReplaceInFolder,
    PCDPermissionType.DeleteFolder
  ].includes(permission.type);
}

export function isAppendToFolderPermission(
  permission: PCDPermission
): permission is AppendToFolderPermission {
  return permission.type === PCDPermissionType.AppendToFolder;
}

export function isReplaceInFolderPermission(
  permission: PCDPermission
): permission is ReplaceInFolderPermission {
  return permission.type === PCDPermissionType.ReplaceInFolder;
}

export function isDeleteFolderPermission(
  permission: PCDPermission
): permission is DeleteFolderPermission {
  return permission.type === PCDPermissionType.DeleteFolder;
}
