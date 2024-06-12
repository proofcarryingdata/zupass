import { PipelineInfoResponseValue } from "@pcd/passport-interface";
import { ReactNode } from "react";

export function SendEmailSection({
  pipelineInfo
}: {
  pipelineInfo: PipelineInfoResponseValue;
}): ReactNode {
  return (
    <div>
      this is the pipeline send section for the pipeline{" "}
      <pre>{JSON.stringify(pipelineInfo, null, 2).substring(0, 100)}</pre>
    </div>
  );
}
