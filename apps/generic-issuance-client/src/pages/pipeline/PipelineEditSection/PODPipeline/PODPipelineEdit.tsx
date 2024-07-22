import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
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
import { ReactNode, useEffect, useReducer } from "react";
import { FancyEditor } from "../../../../components/FancyEditor";
import { PODFeed } from "./PODFeed";
import { PODOutputs } from "./PODOutputs";
import { PODPipelineInputEditWrapper } from "./PODPipelineInputEditWrapper";

type Maybe<T> =
  | {
      success: true;
      result: T;
    }
  | {
      success: false;
    };

function wrap<T>(result: T): Maybe<T> {
  return { success: true, result };
}

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

function reducer(
  state: Maybe<PODPipelineDefinition>,
  action: PODPipelineEditAction
): Maybe<PODPipelineDefinition> {
  if (!state.success) {
    return state;
  }

  switch (action.type) {
    case PODPipelineEditActionType.AddInputColumn:
      return wrap(addInputColumn(state.result, action.name, action.columnType));
    case PODPipelineEditActionType.DeleteInputColumn:
      return wrap(deleteInputColumn(state.result, action.name));
    case PODPipelineEditActionType.RenameInputColumn:
      return wrap(renameInputColumn(state.result, action.name, action.newName));
    case PODPipelineEditActionType.UpdateInputCell:
      return wrap(
        updateInputCell(
          state.result,
          action.rowIndex,
          action.columnName,
          action.value
        )
      );
    case PODPipelineEditActionType.UpdateFeedOptions:
      return wrap({
        ...state.result,
        options: {
          ...state.result.options,
          feedOptions: action.feedOptions
        }
      });
    case PODPipelineEditActionType.AddInputRow:
      return wrap(addInputRow(state.result));
    case PODPipelineEditActionType.AddOutputEntry:
      return wrap(addOutputEntry(state.result, action.outputName));
    case PODPipelineEditActionType.DeleteOutputEntry:
      return wrap(
        deleteOutputEntry(state.result, action.outputName, action.key)
      );
    case PODPipelineEditActionType.ChangeOutputEntryType:
      return wrap(
        changeOutputEntryType(
          state.result,
          action.outputName,
          action.key,
          action.newType
        )
      );
    case PODPipelineEditActionType.ChangeOutputEntryName:
      return wrap(
        changeOutputEntryName(
          state.result,
          action.outputName,
          action.key,
          action.newName
        )
      );
    case PODPipelineEditActionType.ChangeOutputMatch:
      return wrap(
        changeOutputMatch(state.result, action.outputName, action.match)
      );
    case PODPipelineEditActionType.ChangeOutputEntry:
      return wrap(
        changeOutputEntry(
          state.result,
          action.outputName,
          action.key,
          action.entry
        )
      );
    case PODPipelineEditActionType.SetFeedOptions:
      return wrap(setFeedOptions(state.result, action.feedOptions));
    default:
      assertUnreachable(action);
  }
}

function safeJSONParse(value: string): Maybe<PODPipelineDefinition> {
  try {
    return { success: true, result: JSON.parse(value) };
  } catch (e) {
    return { success: false };
  }
}

export function PODPipelineEdit({
  isAdminView,
  ownedBySomeoneElse,
  historyEntry,
  editorValue,
  setEditorValue,
  editorRef,
  editorMaximized
}): ReactNode {
  const [parsed, dispatch] = useReducer(reducer, safeJSONParse(editorValue));

  useEffect(() => {
    if (parsed.success) {
      setEditorValue(JSON.stringify(parsed.result, null, 2));
    }
  }, [parsed, setEditorValue]);

  return (
    <Tabs
      isLazy
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TabList>
        <Tab>Data</Tab>
        <Tab>Outputs</Tab>
        <Tab>Feed</Tab>
        {isAdminView && <Tab>Configuration</Tab>}
      </TabList>

      <TabPanels style={{ height: "100%", overflow: "hidden" }}>
        <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
          <PODPipelineInputEditWrapper
            dispatch={dispatch}
            pipelineDefinitionText={editorValue}
          />
        </TabPanel>

        <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
          <PODOutputs definition={editorValue} dispatch={dispatch} />
        </TabPanel>
        <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
          <PODFeed definition={editorValue} onChange={setEditorValue} />
        </TabPanel>

        <TabPanel style={{ height: "100%" }}>
          <FancyEditor
            dark
            value={editorValue}
            setValue={setEditorValue}
            readonly={(ownedBySomeoneElse && !isAdminView) || !!historyEntry}
            ref={editorRef}
            editorStyle={{
              width: editorMaximized ? "100%" : "100%",
              height: editorMaximized ? "100vh" : "100%"
            }}
            containerStyle={
              editorMaximized ? { border: "none", borderRadius: 0 } : undefined
            }
            editorOptions={
              editorMaximized
                ? {
                    minimap: {
                      enabled: true
                    }
                  }
                : undefined
            }
            language="json"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
