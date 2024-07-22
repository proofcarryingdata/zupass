import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { PODPipelineDefinition } from "@pcd/passport-interface";
import { ReactNode, useEffect, useReducer } from "react";
import { FancyEditor } from "../../../../components/FancyEditor";
import { PODFeed } from "./PODFeed";
import { PODOutputs } from "./PODOutputs";
import { PODPipelineInputEditWrapper } from "./PODPipelineInputEditWrapper";
import { Just, Maybe, MaybeType, Nothing, pipelineEditReducer } from "./state";

function safeJSONParse(value: string): Maybe<PODPipelineDefinition> {
  try {
    return Just(JSON.parse(value));
  } catch (e) {
    return Nothing();
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
  const [parsed, dispatch] = useReducer(
    pipelineEditReducer,
    safeJSONParse(editorValue)
  );

  useEffect(() => {
    if (parsed.type === MaybeType.Just) {
      setEditorValue(JSON.stringify(parsed.value, null, 2));
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
          <PODFeed definition={editorValue} dispatch={dispatch} />
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
