import { Button, Select, Stack } from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { getSampleCSVData, getSampleFeedOptions } from "../../SamplePipelines";
import { FeedOptions } from "./FeedOptions";

interface CSVPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

const DEFAULT_OUTPUT_TYPE = CSVPipelineOutputType.RSAImage;

export default function CSVPipelineBuilder(
  props: CSVPipelineBuilderProps
): ReactNode {
  const [outputType, setOutputType] =
    useState<CSVPipelineOutputType>(DEFAULT_OUTPUT_TYPE);
  const [csv, setCsv] = useState(() => getSampleCSVData(DEFAULT_OUTPUT_TYPE));
  const [feedOptions, setFeedOptions] = useState<FeedIssuanceOptions>(() =>
    getSampleFeedOptions(DEFAULT_OUTPUT_TYPE)
  );

  useEffect(() => {
    setCsv(getSampleCSVData(outputType));
    setFeedOptions(getSampleFeedOptions(outputType));
  }, [outputType]);

  return (
    <Stack gap={4}>
      <FancyEditor
        style={{ height: "300px" }}
        dark
        value={csv}
        setValue={setCsv}
      />
      <div>PCD Output Type:</div>
      <Select
        width="sm"
        value={outputType}
        onChange={(e): void => {
          setOutputType(e.target.value as CSVPipelineOutputType);
        }}
      >
        {Object.entries(CSVPipelineOutputType).map(([k, v]) => (
          <option value={k}>{v}</option>
        ))}
      </Select>
      <br />
      <FeedOptions feedOptions={feedOptions} setFeedOptions={setFeedOptions} />
      <Button
        width="md"
        colorScheme="green"
        variant="outline"
        onClick={(): Promise<void> =>
          props.onCreate(
            JSON.stringify({
              type: PipelineType.CSV,
              timeCreated: new Date().toISOString(),
              timeUpdated: new Date().toISOString(),
              editorUserIds: [],
              options: {
                csv,
                feedOptions,
                outputType
              }
            } satisfies Partial<CSVPipelineDefinition>)
          )
        }
      >
        Create
      </Button>
    </Stack>
  );
}
