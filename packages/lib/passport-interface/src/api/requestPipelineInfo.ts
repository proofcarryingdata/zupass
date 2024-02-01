import urljoin from "url-join";
import { PipelineInfoResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks a feed for new PCDs.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPipelineInfo(
  zupassServerUrl: string,
  pipelineId: string
): Promise<InfoResult> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      `/generic-issuance/api/pipeline-info/`,
      pipelineId
    ),
    async (resText) => ({
      value: JSON.parse(resText) as PipelineInfoResponseValue,
      success: true
    })
  );
}

export type InfoResult = APIResult<PipelineInfoResponseValue>;
