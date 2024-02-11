import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode } from "react";

export function PipelineTitleButton({
  pipeline
}: {
  pipeline?: PipelineDefinition;
}): ReactNode {
  // const location = useLocation();

  if (!pipeline) {
    return null;
  }

  // const isOnThisPageAlready =
  //   pipelineDetailPagePath(pipeline.id) === location.pathname;

  return (
    <>
      {/* <Link
        as={ReactLink}
        to={pipelineDetailPagePath(pipeline.id)}
        onClick={(): void => {
          if (isOnThisPageAlready) {
            window.location.reload();
          }
        }}
      >
        <Badge>{pipelineDisplayNameStr(pipeline)}</Badge>
      </Link>{" "}
      <Badge>{pipeline.id}</Badge> */}
    </>
  );
}
