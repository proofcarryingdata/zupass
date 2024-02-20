import { Button, Select, Stack } from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import {
  SAMPLE_CSV_DATA,
  SAMPLE_CSV_FEED_OPTIONS
} from "../../SamplePipelines";
import { FeedOptions } from "./FeedOptions";

interface CSVPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

export default function CSVPipelineBuilder(
  props: CSVPipelineBuilderProps
): ReactNode {
  const [feedOptions, setFeedOptions] = useState<FeedIssuanceOptions>(
    SAMPLE_CSV_FEED_OPTIONS
  );
  const [outputType, setOutputType] = useState<CSVPipelineOutputType>(
    CSVPipelineOutputType.RSAImage
  );
  const [csv, setCsv] = useState(SAMPLE_CSV_DATA);

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
