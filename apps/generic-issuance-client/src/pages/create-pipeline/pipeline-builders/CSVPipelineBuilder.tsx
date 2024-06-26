import { Box, Button, Card, HStack, Select } from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { getSampleCSVData, getSampleFeedOptions } from "../../SamplePipelines";
import {
  CSVPreview,
  PreviewType
} from "../../pipeline/PipelineEditSection/CSVPreview";
import { TwoColumns } from "../../pipeline/PipelinePage";
import { FeedOptions } from "./FeedOptions";

interface CSVPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

const DEFAULT_OUTPUT_TYPE = CSVPipelineOutputType.Message;

export default function CSVPipelineBuilder(
  props: CSVPipelineBuilderProps
): ReactNode {
  const [outputType, setOutputType] =
    useState<CSVPipelineOutputType>(DEFAULT_OUTPUT_TYPE);
  const [csv, setCsv] = useState(() => getSampleCSVData(DEFAULT_OUTPUT_TYPE));
  const [feedOptions, setFeedOptions] = useState<FeedIssuanceOptions>(() =>
    getSampleFeedOptions(DEFAULT_OUTPUT_TYPE)
  );
  const [previewType, setPreviewType] = useState<PreviewType | undefined>(
    undefined
  );

  useEffect(() => {
    setCsv(getSampleCSVData(outputType));
    setFeedOptions(getSampleFeedOptions(outputType));
  }, [outputType]);

  return (
    <>
      <TwoColumns
        style={{
          gap: "8px",
          height: "100%",
          justifyContent: "space-between",
          alignItems: "stretch"
        }}
      >
        <div
          className="col1"
          style={{ minWidth: "fit-content", width: "fit-content", flexGrow: 0 }}
        >
          <Card overflow="hidden" width="fit-content">
            <Box maxW="800px" minW="800px" height="500px">
              {previewType === undefined && (
                <FancyEditor
                  editorStyle={{ height: "500px", width: "800px" }}
                  dark
                  value={csv}
                  setValue={setCsv}
                />
              )}
              {previewType !== undefined && (
                <CSVPreview
                  csv={csv}
                  previewType={previewType}
                  onChange={setCsv}
                />
              )}
            </Box>
          </Card>
          <HStack mt={2} minWidth="fit-content" width="fit-content">
            <Button
              flexShrink={0}
              disabled={previewType === undefined}
              colorScheme={previewType === undefined ? "blue" : undefined}
              onClick={(): void => setPreviewType(undefined)}
            >
              CSV
            </Button>

            <Button
              flexShrink={0}
              disabled={previewType === PreviewType.CSVSheet}
              colorScheme={
                previewType === PreviewType.CSVSheet ? "blue" : undefined
              }
              onClick={(): void => setPreviewType(PreviewType.CSVSheet)}
            >
              Preview
            </Button>
          </HStack>
        </div>
        <div
          className="col2"
          style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
        >
          <Select
            bg="rgba(29,29,29,1)"
            mb={2}
            width="100%"
            value={outputType}
            onChange={(e): void => {
              setOutputType(e.target.value as CSVPipelineOutputType);
            }}
          >
            {Object.entries(CSVPipelineOutputType).map(([k, v]) => (
              <option value={v} key={v}>
                output type: {k}
              </option>
            ))}
          </Select>

          <FeedOptions
            feedOptions={feedOptions}
            setFeedOptions={setFeedOptions}
          />

          <Button
            mt={2}
            width="100px"
            maxW="100px"
            colorScheme="green"
            onClick={(): Promise<void> =>
              props.onCreate(
                JSON.stringify({
                  type: PipelineType.CSV,
                  timeCreated: new Date().toISOString(),
                  timeUpdated: new Date().toISOString(),
                  editorUserIds: [],
                  options: {
                    name: feedOptions.feedFolder,
                    csv,
                    feedOptions,
                    outputType,
                    match:
                      outputType === CSVPipelineOutputType.POD
                        ? { type: "email", inputField: "email" }
                        : undefined,
                    podOutput:
                      outputType === CSVPipelineOutputType.POD
                        ? {
                            /**
                             * The keys used here are the names of POD entries,
                             * and are arbitrary. Fields can be freely added,
                             * removed, and renamed.
                             */
                            owner: {
                              type: "cryptographic",
                              // Shows how a value can be sourced from the
                              // user's auth credential.
                              source: { type: "credentialSemaphoreID" }
                            },
                            zupass_title: {
                              type: "string",
                              // Shows how a value can be sourced from the CSV
                              // input.
                              source: { type: "input", name: "title" }
                            },
                            zupass_description: {
                              type: "string",
                              source: { type: "input", name: "description" }
                            },
                            zupass_image_url: {
                              type: "string",
                              source: { type: "input", name: "imageUrl" }
                            },
                            zupass_display: {
                              type: "string",
                              // Shows how a value can be specified in
                              // configuration.
                              source: {
                                type: "configured",
                                value: "collectable"
                              }
                            }
                          }
                        : undefined
                  }
                } satisfies Partial<CSVPipelineDefinition>)
              )
            }
          >
            Create
          </Button>
        </div>
      </TwoColumns>
    </>
  );
}
