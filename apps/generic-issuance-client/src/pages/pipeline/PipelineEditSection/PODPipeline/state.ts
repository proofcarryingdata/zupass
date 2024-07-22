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
  deleteOutputEntry,
  renameInputColumn,
  setFeedOptions,
  updateInputCell
} from "@pcd/passport-interface";
import { assertUnreachable } from "@pcd/util";

export enum MaybeType {
  Just = "MaybeType_Just",
  Nothing = "MaybeType_Nothing"
}

interface Just<T>
  extends Readonly<{
    type: typeof MaybeType.Just;
    value: T;
  }> {}

interface Nothing
  extends Readonly<{
    type: typeof MaybeType.Nothing;
  }> {}

export type Maybe<T> = Just<T> | Nothing;

export const Nothing = (): Nothing => ({
  type: MaybeType.Nothing
});

export const Just = <T>(value: T): Just<T> => ({
  type: MaybeType.Just,
  value
});

export enum PODPipelineEditActionType {
  AddInputColumn = "addInputColumn",
  DeleteInputColumn = "deleteInputColumn",
  RenameInputColumn = "renameInputColumn",
  UpdateFeedOptions = "updateFeedOptions",
  UpdateInputCell = "updateInputCell",
  AddInputRow = "addInputRow",
  AddOutputEntry = "addOutputEntry",
  DeleteOutputEntry = "deleteOutputEntry",
  ChangeOutputEntryType = "changeOutputEntryType",
  ChangeOutputEntryName = "changeOutputEntryName",
  ChangeOutputMatch = "changeOutputMatch",
  ChangeOutputEntry = "changeOutputEntry",
  SetFeedOptions = "setFeedOptions"
}

export type PODPipelineEditAction =
  | {
      type: PODPipelineEditActionType.AddInputColumn;
      name: string;
      columnType: PODPipelineInputFieldType;
    }
  | { type: PODPipelineEditActionType.DeleteInputColumn; name: string }
  | {
      type: PODPipelineEditActionType.RenameInputColumn;
      name: string;
      newName: string;
    }
  | {
      type: PODPipelineEditActionType.UpdateFeedOptions;
      feedOptions: FeedIssuanceOptions;
    }
  | {
      type: PODPipelineEditActionType.UpdateInputCell;
      rowIndex: number;
      columnName: string;
      value: InputValue;
    }
  | {
      type: PODPipelineEditActionType.AddInputRow;
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
    };

export function pipelineEditReducer(
  state: Maybe<PODPipelineDefinition>,
  action: PODPipelineEditAction
): Maybe<PODPipelineDefinition> {
  if (state.type === MaybeType.Nothing) {
    return state;
  }

  switch (action.type) {
    case PODPipelineEditActionType.AddInputColumn:
      return Just(addInputColumn(state.value, action.name, action.columnType));
    case PODPipelineEditActionType.DeleteInputColumn:
      return Just(deleteInputColumn(state.value, action.name));
    case PODPipelineEditActionType.RenameInputColumn:
      return Just(renameInputColumn(state.value, action.name, action.newName));
    case PODPipelineEditActionType.UpdateInputCell:
      return Just(
        updateInputCell(
          state.value,
          action.rowIndex,
          action.columnName,
          action.value
        )
      );
    case PODPipelineEditActionType.UpdateFeedOptions:
      return Just({
        ...state.value,
        options: {
          ...state.value.options,
          feedOptions: action.feedOptions
        }
      });
    case PODPipelineEditActionType.AddInputRow:
      return Just(addInputRow(state.value));
    case PODPipelineEditActionType.AddOutputEntry:
      return Just(addOutputEntry(state.value, action.outputName));
    case PODPipelineEditActionType.DeleteOutputEntry:
      return Just(
        deleteOutputEntry(state.value, action.outputName, action.key)
      );
    case PODPipelineEditActionType.ChangeOutputEntryType:
      return Just(
        changeOutputEntryType(
          state.value,
          action.outputName,
          action.key,
          action.newType
        )
      );
    case PODPipelineEditActionType.ChangeOutputEntryName:
      return Just(
        changeOutputEntryName(
          state.value,
          action.outputName,
          action.key,
          action.newName
        )
      );
    case PODPipelineEditActionType.ChangeOutputMatch:
      return Just(
        changeOutputMatch(state.value, action.outputName, action.match)
      );
    case PODPipelineEditActionType.ChangeOutputEntry:
      return Just(
        changeOutputEntry(
          state.value,
          action.outputName,
          action.key,
          action.entry
        )
      );
    case PODPipelineEditActionType.SetFeedOptions:
      return Just(setFeedOptions(state.value, action.feedOptions));
    default:
      assertUnreachable(action);
  }
}
