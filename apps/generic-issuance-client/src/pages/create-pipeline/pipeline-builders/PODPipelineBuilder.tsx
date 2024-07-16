import { Box, Button, Card, HStack } from "@chakra-ui/react";
import {
  FeedIssuanceOptions,
  PODPipelineDefinition,
  PODPipelineInputType,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { DEFAULT_FEED_OPTIONS } from "../../SamplePipelines";
import {
  CSVPreview,
  PreviewType
} from "../../pipeline/PipelineEditSection/CSVPreview";
import { TwoColumns } from "../../pipeline/PipelinePage";
import { FeedOptions } from "./FeedOptions";

interface PODPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

export default function PODPipelineBuilder(
  props: PODPipelineBuilderProps
): ReactNode {
  const [csv, setCsv] = useState(
    "email,title, message\nmail@robknight.org.uk,hello, world"
  );
  const [feedOptions, setFeedOptions] =
    useState<FeedIssuanceOptions>(DEFAULT_FEED_OPTIONS);

  const [previewType, setPreviewType] = useState<PreviewType | undefined>(
    undefined
  );

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
                  type: PipelineType.POD,
                  timeCreated: new Date().toISOString(),
                  timeUpdated: new Date().toISOString(),
                  editorUserIds: [],
                  options: {
                    input: {
                      type: PODPipelineInputType.CSV,
                      csv,
                      columns: {}
                    },
                    outputs: {}
                  }
                } satisfies Partial<PODPipelineDefinition>)
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
