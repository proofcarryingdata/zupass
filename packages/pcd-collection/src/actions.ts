import { SerializedPCD } from "@pcd/pcd-types";

export enum PCDActionType {
  ReplaceInFolder = "ReplaceInFolder_action",
  AppendToFolder = "AppendToFolder_action",
  DeleteFolder = "DeleteFolder_action"
}

export interface PCDAction {
  type: PCDActionType;
}

export interface ReplaceInFolderAction {
  type: PCDActionType.ReplaceInFolder;
  folder: string;
  pcds: SerializedPCD[];
}

export function isReplaceInFolderAction(
  action: PCDAction
): action is ReplaceInFolderAction {
  return action.type === PCDActionType.ReplaceInFolder;
}

export interface AppendToFolderAction {
  type: PCDActionType.AppendToFolder;
  folder: string;
  pcds: SerializedPCD[];
}

export function isAppendToFolderAction(
  action: PCDAction
): action is AppendToFolderAction {
  return action.type === PCDActionType.AppendToFolder;
}

export interface DeleteFolderAction {
  type: PCDActionType.DeleteFolder;
  folder: string;
}

export function isDeleteFolderAction(
  action: PCDAction
): action is DeleteFolderAction {
  return action.type === PCDActionType.DeleteFolder;
}
