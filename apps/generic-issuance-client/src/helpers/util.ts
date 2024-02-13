import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import urljoin from "url-join";
import { ZUPASS_SERVER_URL } from "../constants";

TimeAgo.addDefaultLocale(en);
export const timeAgo = new TimeAgo("en-US");

export function stringifyAndFormat(obj?: object): string {
  return obj ? JSON.stringify(obj, null, 2) : "{\n}";
}

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

export function getAllHoneycombLinkForAllGenericIssuanceHttp(): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "/generic-issuance/api/pipeline-honeycomb/all-http"
  );
}

export function getHoneycombQueryDurationStr(): string {
  return `(last ${1}hr)`;
}
