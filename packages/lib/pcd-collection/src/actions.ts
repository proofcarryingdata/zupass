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

export function getPcdsFromActions(actions: PCDAction[]): SerializedPCD[] {
  let results: SerializedPCD[] = [];

  actions.forEach((action) => {
    if (isAppendToFolderAction(action) || isReplaceInFolderAction(action)) {
      results = [...results, ...action.pcds];
    }
  });

  return results;
}

export function isReplaceInFolderAction(
  action: PCDAction
): action is ReplaceInFolderAction {
  return action.type === PCDActionType.ReplaceInFolder;
}

export function expectIsReplaceInFolderAction(
  action: PCDAction
): asserts action is ReplaceInFolderAction {
  if (action.type !== PCDActionType.ReplaceInFolder) {
    throw new Error("Expected action to be a ReplaceInFolderAction");
  }
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
