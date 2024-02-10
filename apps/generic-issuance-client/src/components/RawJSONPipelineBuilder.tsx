import { ReactNode, useState } from "react";

interface RawJSONPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
  initialValue?: string;
}

// TODO: Edit this once we have the RawJSON API integrated
export default function RawJSONPipelineBuilder(
  props: RawJSONPipelineBuilderProps
): ReactNode {
  const [newPipelineJSON, setNewPipelineJSON] = useState(
    props.initialValue ?? ""
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
