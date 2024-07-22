import { Box, Button, Card } from "@chakra-ui/react";
import {
  CSVInput,
  FeedIssuanceOptions,
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelinePCDTypes,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useMemo, useReducer, useState } from "react";
import { PODPipelineInputEdit } from "../../pipeline/PipelineEditSection/PODPipeline/PODPipelineInputEdit";
import { pipelineEditReducer } from "../../pipeline/PipelineEditSection/PODPipeline/state";
import { TwoColumns } from "../../pipeline/PipelinePage";
import { FeedOptions } from "./FeedOptions";

interface PODPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

export default function PODPipelineBuilder(
  props: PODPipelineBuilderProps
): ReactNode {
  const initialDefinition: PODPipelineDefinition = {
    id: "",
    ownerUserId: "",
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
      feedOptions: {
        feedDisplayName: "POD Pipeline",
        feedFolder: "PODs",
        feedDescription: "New POD Pipeline",
        feedId: "default-feed"
      }
    }
  };

  const [definition, setDefinition] = useState(initialDefinition);

  const [maybeDefinition, dispatch] = useReducer(
    pipelineEditReducer,
    initialDefinition
  );

  useEffect(() => {
    if (maybeDefinition) {
      setDefinition(maybeDefinition);
    }
  }, [maybeDefinition]);

  const csvInput = useMemo(() => {
    return new CSVInput(definition.options.input);
  }, [definition.options.input]);

  const [feedOptions, setFeedOptions] = useState<FeedIssuanceOptions>(
    definition.options.feedOptions
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
              <PODPipelineInputEdit csvInput={csvInput} dispatch={dispatch} />
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
            onClick={(): Promise<void> => {
              // Because we're sticking to the PODPipelineDefinition type, we
              // have used an "id" and "ownerUserId" field that we don't want
              // to include in the final definition. Remove them before
              // submitting the definition to the server.
              const simplifiedDefinition: Partial<PODPipelineDefinition> =
                structuredClone({
                  ...definition,
                  timeCreated: new Date().toISOString(),
                  timeUpdated: new Date().toISOString(),
                  options: {
                    ...definition.options,
                    name: definition.options.feedOptions.feedDisplayName
                  }
                });
              delete simplifiedDefinition.id;
              delete simplifiedDefinition.ownerUserId;
              return props.onCreate(JSON.stringify(simplifiedDefinition));
            }}
          >
            Create
          </Button>
        </div>
      </TwoColumns>
    </>
  );
}
