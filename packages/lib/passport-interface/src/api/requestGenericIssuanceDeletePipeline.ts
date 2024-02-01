import urlJoin from "url-join";
import { GenericIssuanceDeletePipelineResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpDeleteSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceDeletePipeline(
  zupassServerUrl: string,
  pipelineId: string
): Promise<GenericIssuanceDeletePipelineResponse> {
  return httpDeleteSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines/${pipelineId}`),
    async () => ({
      value: undefined,
      success: true
    }),
    true
  );
}

export type GenericIssuanceDeletePipelineResponse =
  APIResult<GenericIssuanceDeletePipelineResponseValue>;
