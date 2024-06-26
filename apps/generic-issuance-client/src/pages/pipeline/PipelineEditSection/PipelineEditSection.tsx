import { Box, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue,
  isCSVPipelineDefinition
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  FancyEditor,
  FancyEditorHandle
} from "../../../components/FancyEditor";
import { Maximizer } from "../../../components/Maximizer";
import { useViewingPipelineDefinition } from "../../../helpers/Context";
import { stringifyAndFormat } from "../../../helpers/util";
import { CSVPreview, PreviewType } from "./CSVPreview";
import { PipelineActions } from "./PipelineActions";
import { SinglePipelineTable } from "./SinglePipelineTable";

export function PipelineEditSection({
  user,
  pipeline,
  isAdminView,
  pipelineInfo
}: {
  user: GenericIssuanceSelfResponseValue;
  pipeline: PipelineDefinition;
  pipelineInfo: PipelineInfoResponseValue;
  isAdminView: boolean;
}): ReactNode {
  const [actionInProgress, setActionInProgress] = useState<
    string | undefined
  >();
  const ownedBySomeoneElse = pipeline.ownerUserId !== user.id;
  const { historyEntry, pipeline: maybeHistoricPipeline } =
    useViewingPipelineDefinition(pipeline);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const editorRef = useRef<FancyEditorHandle>();
  const [editorValue, setEditorValue] = useState(
    stringifyAndFormat(maybeHistoricPipeline)
  );

  useEffect(() => {
    setEditorValue(stringifyAndFormat(maybeHistoricPipeline));
    setTimeout(() => {
      editorRef.current?.editor?.trigger("fold", "editor.foldLevel3", {});
      setTimeout(() => {
        editorRef.current?.editor?.setScrollPosition({
          scrollLeft: 0,
          scrollTop: 0
        });
      }, 500);
    }, 100);
  }, [maybeHistoricPipeline, editorMaximized]);

  useEffect(() => {
    editorRef.current?.editor?.setScrollPosition({
      scrollLeft: 0,
      scrollTop: 0
    });
  }, [historyEntry]);

  return (
    <Container>
      <Box padding={0} mb={0} flexShrink={0}>
        <SinglePipelineTable {...{ pipeline, pipelineInfo }} />
      </Box>

      <div style={{ flexGrow: 1, flexShrink: 1, overflow: "hidden" }}>
        <Maximizer
          maximized={editorMaximized}
          setMaximized={setEditorMaximized}
        >
          <Tabs style={{ height: "100%" }}>
            {isCSVPipelineDefinition(pipeline) && (
              <TabList>
                <Tab>Configuration</Tab>
                <Tab>Data</Tab>
              </TabList>
            )}

            <TabPanels style={{ height: "100%", overflow: "hidden" }}>
              <TabPanel style={{ height: "100%" }}>
                <FancyEditor
                  dark
                  value={editorValue}
                  setValue={setEditorValue}
                  readonly={
                    (ownedBySomeoneElse && !isAdminView) || !!historyEntry
                  }
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
              {isCSVPipelineDefinition(pipeline) && (
                <TabPanel style={{ height: "100%", overflowY: "scroll" }}>
                  <CSVPreview
                    previewType={PreviewType.CSVSheet}
                    csv={pipeline.options.csv}
                    onChange={(newCsv: string) => {
                      try {
                        const pipelineContent = JSON.parse(editorValue);
                        if (pipelineContent) {
                          pipelineContent.options.csv = newCsv;
                          setEditorValue(
                            JSON.stringify(pipelineContent, null, 2)
                          );
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }}
                  />
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </Maximizer>
      </div>

      <div
        style={{
          flexShrink: "1"
        }}
      >
        <PipelineActions
          actionInProgress={actionInProgress}
          setActionInProgress={setActionInProgress}
          user={user}
          pipeline={pipeline}
          pipelineInfo={pipelineInfo}
          isAdminView={isAdminView}
          editorValue={editorValue}
          setEditorValue={setEditorValue}
          setEditorMaximized={setEditorMaximized}
        />
      </div>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  gap: 8px;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: column;
`;
