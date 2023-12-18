import { SerializedPCD } from "@pcd/pcd-types";

export const PCDActionType = {
  ReplaceInFolder: "ReplaceInFolder_action",
  AppendToFolder: "AppendToFolder_action",
  DeleteFolder: "DeleteFolder_action"
} as const;

export type PCDAction =
  | AppendToFolderAction
  | ReplaceInFolderAction
  | DeleteFolderAction;

export interface ReplaceInFolderAction {
  type: typeof PCDActionType.ReplaceInFolder;
  folder: string;
  pcds: SerializedPCD[];
}

export function isReplaceInFolderAction(
  action: PCDAction
): action is ReplaceInFolderAction {
  return action.type === PCDActionType.ReplaceInFolder;
}

export interface AppendToFolderAction {
  type: typeof PCDActionType.AppendToFolder;
  folder: string;
  pcds: SerializedPCD[];
}

export function isAppendToFolderAction(
  action: PCDAction
): action is AppendToFolderAction {
  return action.type === PCDActionType.AppendToFolder;
}

export interface DeleteFolderAction {
  type: typeof PCDActionType.DeleteFolder;
  folder: string;
  recursive: boolean;
}

export function isDeleteFolderAction(
  action: PCDAction
): action is DeleteFolderAction {
  return action.type === PCDActionType.DeleteFolder;
}
