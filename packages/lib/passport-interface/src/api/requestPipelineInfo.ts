import urljoin from "url-join";
import {
  PipelineInfoRequest,
  PipelineInfoResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks generic issuance backend for details about a {@link Pipeline}.
 * User has to be authenticated as an owner or editor of the pipeline.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPipelineInfo(
  userJWT: string,
  zupassServerUrl: string,
  pipelineId: string
): Promise<InfoResult> {
  return httpPostSimple(
    urljoin(zupassServerUrl, `/generic-issuance/api/pipeline-info/`),
    async (resText) => ({
      value: JSON.parse(resText) as PipelineInfoResponseValue,
      success: true
    }),
    {
      pipelineId,
      jwt: userJWT
    } satisfies PipelineInfoRequest
  );
}

export type InfoResult = APIResult<PipelineInfoResponseValue>;
