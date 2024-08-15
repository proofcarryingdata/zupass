import {
  Alert,
  AlertIcon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from "@chakra-ui/react";
import {
  PODPipelineDefinition,
  PODPipelineDefinitionSchema
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useReducer, useRef } from "react";
import { FancyEditor } from "../../../../components/FancyEditor";
import { PODFeed } from "./PODFeed";
import { PODOutputs } from "./PODOutputs";
import { PODPipelineInputEdit } from "./PODPipelineInputEdit";
import { PODPipelineEditActionType, pipelineEditReducer } from "./state";

function safeJSONParse(value: string): PODPipelineDefinition | undefined {
  try {
    return PODPipelineDefinitionSchema.parse(JSON.parse(value));
  } catch (e) {
    return undefined;
  }
}

/**
 * If the pipeline is not configured correctly, show an error message.
 *
 * If the user is an admin, they can switch back to configuration view to fix
 * the issue. If the user is not an admin, they can contact support to resolve
 * the issue. Because these errors result from a failure to parse the JSON,
 * there is no way for a non-admin user to take any action directly.
 */
function ErrorTab({ isAdminView }: { isAdminView: boolean }): ReactNode {
  return (
    <Alert status="error">
      <AlertIcon />

      {isAdminView ? (
        <Text>
          The pipeline is not configured correctly. Switch back to Configuration
          view to ensure that the configuration is valid.
        </Text>
      ) : (
        <Text>
          The pipeline is not configured correctly. Contact support to resolve
          this issue.
        </Text>
      )}
    </Alert>
  );
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
  // Set up the reducer to manage state for the pipeline editing components.
  // Unlike the admin-only editor view, these components work with a parsed
  // representation of the pipeline definition rather than raw JSON.
  const [parsed, dispatch] = useReducer(
    pipelineEditReducer,
    // Parse the definition from the editor value
    editorValue,
    safeJSONParse
  );

  // Now we have to keep both the parsed definition and editor value in sync.
  // First, store a Ref to the latest editor value.
  const editorValueRef = useRef(editorValue);

  // If the editor value changes, update the ref and try to parse the new value.
  // If the parse is successful, dispatch an action to update the state.
  useEffect(() => {
    if (editorValue !== editorValueRef.current) {
      editorValueRef.current = editorValue;
      const newParsed = safeJSONParse(editorValue);
      dispatch({
        type: PODPipelineEditActionType.Reset,
        newVersion: newParsed
      });
    }
  }, [editorValue, dispatch]);

  // If the parsed definition changes, update the editor value.
  // There is a risk of looping here, which is why we use a Ref to track the
  // editor value. If we update the editor value here, we do so only after
  // storing that value in the Ref, which means that when the previous effect
  // fires again, it will not dispatch a state update, because the editor value
  // will be the same as the one stored in the Ref.
  useEffect(() => {
    if (parsed) {
      const newValue = JSON.stringify(parsed, null, 2);
      editorValueRef.current = newValue;
      setEditorValue(newValue);
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
          {parsed ? (
            <PODPipelineInputEdit definition={parsed} dispatch={dispatch} />
          ) : (
            <ErrorTab isAdminView={isAdminView} />
          )}
        </TabPanel>

        <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
          {parsed ? (
            <PODOutputs definition={parsed} dispatch={dispatch} />
          ) : (
            <ErrorTab isAdminView={isAdminView} />
          )}
        </TabPanel>
        <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
          {parsed ? (
            <PODFeed definition={parsed} dispatch={dispatch} />
          ) : (
            <ErrorTab isAdminView={isAdminView} />
          )}
        </TabPanel>

        {isAdminView && (
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
                editorMaximized
                  ? { border: "none", borderRadius: 0 }
                  : undefined
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
        )}
      </TabPanels>
    </Tabs>
  );
}
