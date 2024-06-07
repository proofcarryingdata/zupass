import urljoin from "url-join";
import { PipelineSetManualCheckInStateResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Sets a ticket's check-in state to the provided boolean value.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceSetManualCheckInState(
  zupassServerUrl: string,
  pipelineId: string,
  key: string,
  ticketId: string,
  checkInState: boolean
): Promise<PipelineSetManualCheckInStateResult> {
  return httpPostSimple(
    urljoin(
      zupassServerUrl,
      "/generic-issuance/api/manual-checkin",
      pipelineId,
      key
    ),
    async (resText) => ({
      value: JSON.parse(resText) as PipelineSetManualCheckInStateResponseValue,
      success: true
    }),
    {
      ticketId,
      checkInState
    }
  );
}

export type PipelineSetManualCheckInStateResult =
  APIResult<PipelineSetManualCheckInStateResponseValue>;
