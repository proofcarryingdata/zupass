import { ReactNode } from "react";
import { SAMPLE_LEMONADE_PIPELINE } from "../pages/SamplePipelines";
import RawJSONPipelineBuilder from "./RawJSONPipelineBuilder";

interface LemonadePipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

// TODO: Edit this once we have the Lemonade API integrated
export default function LemonadePipelineBuilder(
  props: LemonadePipelineBuilderProps
): ReactNode {
  return (
    <RawJSONPipelineBuilder
      initialValue={SAMPLE_LEMONADE_PIPELINE}
      onCreate={props.onCreate}
    />
  );
}
