import urlJoin from "url-join";
import { GenericIssuanceClearPipelineCacheRequest } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to clear the cache for a given pipeline.
 */
export async function requestGenericIssuanceClearPipelineCache(
  zupassServerUrl: string,
  req: GenericIssuanceClearPipelineCacheRequest
): Promise<GenericIssuanceClearPipelineCacheResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/clear-pipeline-cache`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    req,
    true
  );
}

export type GenericIssuanceClearPipelineCacheResponse = APIResult<undefined>;
