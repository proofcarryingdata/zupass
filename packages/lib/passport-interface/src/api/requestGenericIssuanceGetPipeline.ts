import urlJoin from "url-join";
import {
  GenericIssuanceGetPipelineRequest,
  GenericIssuanceGetPipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

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
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines/${pipelineId}`),
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
