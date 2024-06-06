import urljoin from "url-join";
import { PipelineGetManualCheckInsResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Hits an endpoint to download a semaphore protocol group.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceGetManualCheckIns(
  zupassServerUrl: string,
  pipelineId: string,
  key: string
): Promise<PipelineGetManualCheckInsResult> {
  return httpGetSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/manual-checkin",
      pipelineId,
      key
    ),
    async (resText) => ({
      value: JSON.parse(resText) as PipelineGetManualCheckInsResponseValue,
      success: true
    })
  );
}

export type PipelineGetManualCheckInsResult =
  APIResult<PipelineGetManualCheckInsResponseValue>;
