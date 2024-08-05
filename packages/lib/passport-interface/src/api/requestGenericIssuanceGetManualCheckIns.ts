import urljoin from "url-join";
import { PipelineGetManualCheckInsResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Retrieves a summary of check-in status for all tickets on a given pipeline.
 * See {@link PipelineGetManualCheckInsResponseValue}.
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
