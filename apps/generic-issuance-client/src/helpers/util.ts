import urljoin from "url-join";
import { ZUPASS_SERVER_URL } from "../constants";

export function getHoneycombLinkForPipeline(pipelineId: string): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "/generic-issuance/api/pipeline-honeycomb/",
    pipelineId
  );
}
