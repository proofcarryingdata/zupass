import urlJoin from "url-join";
import {
  ZuboxUpsertPipelineRequest,
  ZuboxUpsertPipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestZuboxUpsertPipeline(
  zupassServerUrl: string,
  req: ZuboxUpsertPipelineRequest
): Promise<ZuboxUpsertPipelineResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/upsert-pipeline`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    req,
    true
  );
}

export type ZuboxUpsertPipelineResponse =
  APIResult<ZuboxUpsertPipelineResponseValue>;
