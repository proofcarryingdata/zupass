import { ReactNode, useState } from "react";
import { SAMPLE_LEMONADE_PIPELINE } from "../pages/SamplePipelines";

interface LemonadePipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

// TODO: Edit this once we have the Lemonade API integrated
export default function LemonadePipelineBuilder(
  props: LemonadePipelineBuilderProps
): ReactNode {
  const [newPipelineJSON, setNewPipelineJSON] = useState(
    SAMPLE_LEMONADE_PIPELINE
  );
  return (
    <div
      style={{
        marginTop: "8px"
      }}
    >
      <textarea
        cols={120}
        rows={40}
        value={newPipelineJSON}
        onChange={(e): void => setNewPipelineJSON(e.target.value)}
      />
      <div>
        <button onClick={(): Promise<void> => props.onCreate(newPipelineJSON)}>
          🐒 Create! 🚀
        </button>
      </div>
    </div>
  );
}
