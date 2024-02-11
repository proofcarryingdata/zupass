import { FeedIssuanceOptions, PipelineType } from "@pcd/passport-interface";
import { ReactNode, useState } from "react";
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
  const [csv, setCsv] = useState(SAMPLE_CSV_DATA);
  return (
    <div
      style={{
        marginTop: "8px"
      }}
    >
      <textarea
        cols={120}
        rows={40}
        value={csv}
        onChange={(e): void => setCsv(e.target.value)}
      />
      <FeedOptions feedOptions={feedOptions} setFeedOptions={setFeedOptions} />
      <button
        onClick={(): Promise<void> =>
          props.onCreate(
            JSON.stringify({
              type: PipelineType.CSV,
              timeCreated: new Date().toISOString(),
              timeUpdated: new Date().toISOString(),
              editorUserIds: [],
              options: {
                csv,
                feedOptions
              }
            })
          )
        }
      >
        Create Pipeline
      </button>
    </div>
  );
}
