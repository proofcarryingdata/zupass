// TODO: test that PCDPermissionType and PCDActionType don't overlap
export enum PCDPermissionType {
  ReplaceInFolder = "ReplaceInFolder_permission",
  AppendToFolder = "AppendToFolder_permission"
}

export interface PCDPermission {
  type: PCDPermissionType;
}

export interface PCDFolderPermission extends PCDPermission {
  type: PCDPermissionType.AppendToFolder | PCDPermissionType.ReplaceInFolder;
  folder: string;
}

export interface AppendToFolderPermission extends PCDPermission {
  type: PCDPermissionType.AppendToFolder;
  folder: string;
}

export interface ReplaceInFolderPermission extends PCDPermission {
  type: PCDPermissionType.ReplaceInFolder;
  folder: string;
}

export function isPCDFolderPermission(
  permission: PCDPermission
): permission is PCDFolderPermission {
  return [
    PCDPermissionType.AppendToFolder,
    PCDPermissionType.ReplaceInFolder
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
