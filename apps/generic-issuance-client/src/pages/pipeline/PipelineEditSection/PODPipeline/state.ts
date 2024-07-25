import {
  FeedIssuanceOptions,
  InputValue,
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineOutputMatch,
  PODPipelinePODEntry,
  addInputColumn,
  addInputRow,
  addOutputEntry,
  changeOutputEntry,
  changeOutputEntryName,
  changeOutputEntryType,
  changeOutputMatch,
  deleteInputColumn,
  deleteInputRow,
  deleteOutputEntry,
  renameInputColumn,
  setFeedOptions,
  updateInputCSV
} from "@pcd/passport-interface";
import { assertUnreachable } from "@pcd/util";

/**
 * This file contains the state management for the POD Pipeline.
 *
 * The state is a PODPipelineDefinition, which may be undefined if the JSON for
 * the POD Pipeline is invalid (e.g. if the user pasted invalid JSON into the
 * editor).
 *
 * The state is managed by a reducer. The reducer is used to update the state
 * based on the user's actions.
 */

/**
 * The actions that the user can take while editing the POD Pipeline.
 */
export enum PODPipelineEditActionType {
  AddInputColumn = "addInputColumn",
  DeleteInputColumn = "deleteInputColumn",
  RenameInputColumn = "renameInputColumn",
  UpdateFeedOptions = "updateFeedOptions",
  AddInputRow = "addInputRow",
  DeleteInputRow = "deleteInputRow",
  UpdateInputCSV = "updateInputCSV",
  AddOutputEntry = "addOutputEntry",
  DeleteOutputEntry = "deleteOutputEntry",
  ChangeOutputEntryType = "changeOutputEntryType",
  ChangeOutputEntryName = "changeOutputEntryName",
  ChangeOutputMatch = "changeOutputMatch",
  ChangeOutputEntry = "changeOutputEntry",
  SetFeedOptions = "setFeedOptions",
  Reset = "reset"
}

/**
 * Action definitions including parameters.
 */
export type PODPipelineEditAction =
  | {
      type: PODPipelineEditActionType.AddInputColumn;
      name: string;
      columnType: PODPipelineInputFieldType;
      csvData: string[][];
    }
  | {
      type: PODPipelineEditActionType.DeleteInputColumn;
      name: string;
      csvData: string[][];
    }
  | {
      type: PODPipelineEditActionType.RenameInputColumn;
      name: string;
      newName: string;
      csvData: string[][];
    }
  | {
      type: PODPipelineEditActionType.UpdateFeedOptions;
      feedOptions: FeedIssuanceOptions;
    }
  | {
      type: PODPipelineEditActionType.UpdateInputCSV;
      data: InputValue[][];
    }
  | {
      type: PODPipelineEditActionType.AddInputRow;
      csvData: string[][];
    }
  | {
      type: PODPipelineEditActionType.DeleteInputRow;
      rowIndex: number;
      csvData: string[][];
    }
  | {
      type: PODPipelineEditActionType.AddOutputEntry;
      outputName: string;
    }
  | {
      type: PODPipelineEditActionType.DeleteOutputEntry;
      outputName: string;
      key: string;
    }
  | {
      type: PODPipelineEditActionType.ChangeOutputEntryType;
      outputName: string;
      key: string;
      newType: PODPipelinePODEntry["type"];
    }
  | {
      type: PODPipelineEditActionType.ChangeOutputEntryName;
      outputName: string;
      key: string;
      newName: string;
    }
  | {
      type: PODPipelineEditActionType.ChangeOutputEntry;
      outputName: string;
      key: string;
      entry: PODPipelinePODEntry;
    }
  | {
      type: PODPipelineEditActionType.ChangeOutputMatch;
      outputName: string;
      match: PODPipelineOutputMatch;
    }
  | {
      type: PODPipelineEditActionType.SetFeedOptions;
      feedOptions: FeedIssuanceOptions;
    }
  | {
      type: PODPipelineEditActionType.Reset;
      newVersion: PODPipelineDefinition | undefined;
    };

/**
 * The reducer for the POD Pipeline.
 *
 * @param state - The current state of the POD Pipeline.
 * @param action - The action to be taken.
 * @returns The new state of the POD Pipeline.
 */
export function pipelineEditReducer(
  state: PODPipelineDefinition | undefined,
  action: PODPipelineEditAction
): PODPipelineDefinition | undefined {
  if (state === undefined) {
    return undefined;
  }
  switch (action.type) {
    case PODPipelineEditActionType.AddInputColumn:
      return addInputColumn(
        state,
        action.name,
        action.columnType,
        action.csvData
      );
    case PODPipelineEditActionType.DeleteInputColumn:
      return deleteInputColumn(state, action.name, action.csvData);
    case PODPipelineEditActionType.RenameInputColumn:
      return renameInputColumn(
        state,
        action.name,
        action.newName,
        action.csvData
      );
    case PODPipelineEditActionType.UpdateFeedOptions:
      return {
        ...state,
        options: {
          ...state.options,
          feedOptions: action.feedOptions
        }
      };
    case PODPipelineEditActionType.AddInputRow:
      return addInputRow(state, action.csvData);
    case PODPipelineEditActionType.DeleteInputRow:
      return deleteInputRow(state, action.rowIndex, action.csvData);
    case PODPipelineEditActionType.UpdateInputCSV:
      return updateInputCSV(state, action.data);
    case PODPipelineEditActionType.AddOutputEntry:
      return addOutputEntry(state, action.outputName);
    case PODPipelineEditActionType.DeleteOutputEntry:
      return deleteOutputEntry(state, action.outputName, action.key);
    case PODPipelineEditActionType.ChangeOutputEntryType:
      return changeOutputEntryType(
        state,
        action.outputName,
        action.key,
        action.newType
      );
    case PODPipelineEditActionType.ChangeOutputEntryName:
      return changeOutputEntryName(
        state,
        action.outputName,
        action.key,
        action.newName
      );
    case PODPipelineEditActionType.ChangeOutputMatch:
      return changeOutputMatch(state, action.outputName, action.match);
    case PODPipelineEditActionType.ChangeOutputEntry:
      return changeOutputEntry(
        state,
        action.outputName,
        action.key,
        action.entry
      );
    case PODPipelineEditActionType.SetFeedOptions:
      return setFeedOptions(state, action.feedOptions);
    case PODPipelineEditActionType.Reset:
      return action.newVersion;
    default:
      assertUnreachable(action);
  }
}
