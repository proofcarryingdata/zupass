import urlJoin from "url-join";
import {
  GenericIssuanceUpsertPipelineRequest,
  GenericIssuanceUpsertPipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPutSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceUpsertPipeline(
  zupassServerUrl: string,
  pipeline: GenericIssuanceUpsertPipelineRequest
): Promise<GenericIssuanceUpsertPipelineResponse> {
  return httpPutSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    pipeline,
    true
  );
}

export type GenericIssuanceUpsertPipelineResponse =
  APIResult<GenericIssuanceUpsertPipelineResponseValue>;
