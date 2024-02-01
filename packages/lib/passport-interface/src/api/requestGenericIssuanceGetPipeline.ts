import urlJoin from "url-join";
import { GenericIssuanceGetPipelineResponseValue } from "../RequestTypes";
import { PipelineDefinitionSchema } from "../genericIssuance";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestGenericIssuanceGetPipeline(
  zupassServerUrl: string,
  pipelineId: string
): Promise<GenericIssuanceGetPipelineResponse> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/pipelines/${pipelineId}`),
    async (resText) => ({
      value: PipelineDefinitionSchema.parse(resText),
      success: true
    }),
    undefined,
    true
  );
}

export type GenericIssuanceGetPipelineResponse =
  APIResult<GenericIssuanceGetPipelineResponseValue>;
