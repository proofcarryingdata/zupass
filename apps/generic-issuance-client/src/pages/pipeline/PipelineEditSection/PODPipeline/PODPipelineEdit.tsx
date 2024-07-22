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
import { ReactNode, useEffect, useReducer } from "react";
import { FancyEditor } from "../../../../components/FancyEditor";
import { PODFeed } from "./PODFeed";
import { PODOutputs } from "./PODOutputs";
import { PODPipelineInputEditWrapper } from "./PODPipelineInputEditWrapper";
import { pipelineEditReducer } from "./state";

function safeJSONParse(value: string): PODPipelineDefinition | undefined {
  try {
    return PODPipelineDefinitionSchema.parse(JSON.parse(value));
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

/**
 * If the pipeline is not configured correctly, show an error message.
 *
 * If the user is an admin, they can switch back to configuration view to fix
 * the issue. If the user is not an admin, they can contact support to resolve
 * the issue. Because these errors result from a failure to parse the JSON,
 * there is no way for a non-admin user to resolve the issue.
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
  const [parsed, dispatch] = useReducer(
    pipelineEditReducer,
    safeJSONParse(editorValue)
  );

  useEffect(() => {
    if (parsed) {
      setEditorValue(JSON.stringify(parsed, null, 2));
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
            <PODPipelineInputEditWrapper
              dispatch={dispatch}
              definition={parsed}
            />
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

        <TabPanel style={{ height: "100%" }}>
          {isAdminView && (
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
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
