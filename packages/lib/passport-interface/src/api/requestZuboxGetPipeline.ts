import urlJoin from "url-join";
import {
  ZuboxGetPipelineRequest,
  ZuboxGetPipelineResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the pipeline definition corresponding to the
 * given pipeline ID. Requires cookies, as this is part of generic issuance
 * user authentication.
 */
export async function requestZuboxGetPipeline(
  zupassServerUrl: string,
  pipelineId: string,
  jwt: string
): Promise<ZuboxGetPipelineResponse> {
  return httpPostSimple(
    urlJoin(
      zupassServerUrl,
      `/generic-issuance/api/get-pipeline/${pipelineId}`
    ),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    { jwt } satisfies ZuboxGetPipelineRequest,
    true
  );
}

export type ZuboxGetPipelineResponse = APIResult<ZuboxGetPipelineResponseValue>;
