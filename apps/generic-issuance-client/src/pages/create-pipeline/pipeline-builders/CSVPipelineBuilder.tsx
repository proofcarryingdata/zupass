import { Button, Select } from "@chakra-ui/react";
import {
  CSVPipelineDefinition,
  CSVPipelineOutputType,
  FeedIssuanceOptions,
  PipelineType
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { getSampleCSVData, getSampleFeedOptions } from "../../SamplePipelines";
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

  useEffect(() => {
    setCsv(getSampleCSVData(outputType));
    setFeedOptions(getSampleFeedOptions(outputType));
  }, [outputType]);

  return (
    <>
      <TwoColumns style={{ gap: "8px" }}>
        <div className="col1">
          <FancyEditor
            style={{ height: "300px" }}
            dark
            value={csv}
            setValue={setCsv}
          />
        </div>
        <div className="col2">
          <FeedOptions
            feedOptions={feedOptions}
            setFeedOptions={setFeedOptions}
          />
        </div>
      </TwoColumns>
      <Select
        bg="rgba(29,29,29,1)"
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
      <Button
        width="100%"
        colorScheme="green"
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
    </>
  );
}
