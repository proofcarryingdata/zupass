import urlJoin from "url-join";
import {
  ZuboxDeletePipelineRequest,
  ZuboxDeletePipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestZuboxDeletePipeline(
  zupassServerUrl: string,
  pipelineId: string,
  jwt: string
): Promise<ZuboxDeletePipelineResponse> {
  return httpPostSimple(
    urlJoin(
      zupassServerUrl,
      `/generic-issuance/api/delete-pipeline/${pipelineId}`
    ),
    async () => ({
      value: undefined,
      success: true
    }),
    {
      jwt
    } as ZuboxDeletePipelineRequest
  );
}

export type ZuboxDeletePipelineResponse =
  APIResult<ZuboxDeletePipelineResponseValue>;
