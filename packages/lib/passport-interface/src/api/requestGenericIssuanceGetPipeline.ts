import urlJoin from "url-join";
import {
  GenericIssuanceGetPipelineRequest,
  GenericIssuanceGetPipelineResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceGetPipeline(
  zupassServerUrl: string,
  pipelineId: string,
  jwt: string
): Promise<GenericIssuanceGetPipelineResponse> {
  return httpPostSimple(
    urlJoin(
      zupassServerUrl,
      `/generic-issuance/api/get-pipeline/${pipelineId}`
    ),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    { jwt } satisfies GenericIssuanceGetPipelineRequest,
    true
  );
}

export type GenericIssuanceGetPipelineResponse =
  APIResult<GenericIssuanceGetPipelineResponseValue>;
