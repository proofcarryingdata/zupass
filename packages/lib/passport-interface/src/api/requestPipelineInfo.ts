import urljoin from "url-join";
import { PipelineInfoResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

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
    }
  );
}

export type InfoResult = APIResult<PipelineInfoResponseValue>;
