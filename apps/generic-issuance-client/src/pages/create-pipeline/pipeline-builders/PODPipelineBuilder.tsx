import { Box, Button, Card } from "@chakra-ui/react";
import {
  CSVInput,
  FeedIssuanceOptions,
  PODPipelineDefinition,
  PODPipelineInput,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelinePCDTypes,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useMemo, useState } from "react";
import { DEFAULT_FEED_OPTIONS } from "../../SamplePipelines";
import { PODPipelineInputEdit } from "../../pipeline/PipelineEditSection/PODPipeline/PODPipelineInputEdit";
import { TwoColumns } from "../../pipeline/PipelinePage";
import { FeedOptions } from "./FeedOptions";

interface PODPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

export default function PODPipelineBuilder(
  props: PODPipelineBuilderProps
): ReactNode {
  const [definition, setDefinition] = useState<
    Omit<PODPipelineDefinition, "id" | "ownerUserId">
  >({
    type: PipelineType.POD,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    editorUserIds: [],
    options: {
      input: {
        type: PODPipelineInputType.CSV,
        csv: "email,title,message\ntest@example.com,hello,world",
        columns: {
          email: { type: PODPipelineInputFieldType.String },
          title: { type: PODPipelineInputFieldType.String },
          message: { type: PODPipelineInputFieldType.String }
        }
      },
      outputs: {
        pod1: {
          pcdType: PODPipelinePCDTypes.PODPCD,
          entries: {},
          match: {
            type: "none"
          }
        }
      },
      feedOptions: DEFAULT_FEED_OPTIONS
    }
  });

  const csvInput = useMemo(() => {
    return new CSVInput(definition.options.input);
  }, [definition.options.input]);

  const changeInput = (newInput: PODPipelineInput): void => {
    setDefinition((prev) => ({
      ...prev,
      options: { ...prev.options, input: newInput }
    }));
  };

  const [feedOptions, setFeedOptions] =
    useState<FeedIssuanceOptions>(DEFAULT_FEED_OPTIONS);

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
              <PODPipelineInputEdit
                csvInput={csvInput}
                onChange={changeInput}
              />
            </Box>
          </Card>
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
              props.onCreate(JSON.stringify(definition))
            }
          >
            Create
          </Button>
        </div>
      </TwoColumns>
    </>
  );
}
