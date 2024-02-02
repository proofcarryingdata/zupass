import urlJoin from "url-join";
import {
  GenericIssuanceDeletePipelineRequest,
  GenericIssuanceDeletePipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceDeletePipeline(
  zupassServerUrl: string,
  pipelineId: string,
  jwt: string
): Promise<GenericIssuanceDeletePipelineResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines/${pipelineId}`),
    async () => ({
      value: undefined,
      success: true
    }),
    {
      jwt
    } as GenericIssuanceDeletePipelineRequest
  );
}

export type GenericIssuanceDeletePipelineResponse =
  APIResult<GenericIssuanceDeletePipelineResponseValue>;
