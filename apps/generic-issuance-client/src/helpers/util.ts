import urljoin from "url-join";
import { ZUPASS_SERVER_URL } from "../constants";

export function getLoadTraceHoneycombLinkForPipeline(
  pipelineId: string
): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "/generic-issuance/api/pipeline-honeycomb/load",
    pipelineId
  );
}

export function getAllHoneycombLinkForPipeline(pipelineId: string): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "/generic-issuance/api/pipeline-honeycomb/all",
    pipelineId
  );
}

export function getAllHoneycombLinkForAllGenericIssuance(): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "/generic-issuance/api/pipeline-honeycomb/all"
  );
}
