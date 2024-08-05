import urlJoin from "url-join";
import {
  GenericIssuanceUpsertPipelineRequest,
  GenericIssuanceUpsertPipelineResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceUpsertPipeline(
  zupassServerUrl: string,
  req: GenericIssuanceUpsertPipelineRequest
): Promise<GenericIssuanceUpsertPipelineResponse> {
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

export type GenericIssuanceUpsertPipelineResponse =
  APIResult<GenericIssuanceUpsertPipelineResponseValue>;
