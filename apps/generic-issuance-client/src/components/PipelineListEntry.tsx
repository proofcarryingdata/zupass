import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function PipelineListEntry({
  pipeline
}: {
  pipeline: PipelineDefinition;
}): ReactNode {
  return (
    <li key={pipeline.id}>
      <Link to={`/pipelines/${pipeline.id}`}>
        id: {pipeline.id}, type: {pipeline.type}
      </Link>
    </li>
  );
}
