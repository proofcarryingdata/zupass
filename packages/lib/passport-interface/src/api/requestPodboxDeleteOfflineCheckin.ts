import urlJoin from "url-join";
import {
  PodboxDeleteOfflineCheckinRequest,
  PodboxDeleteOfflineCheckinResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Deletes a queued offline check-in.
 */
export async function requestPodboxDeleteOfflineCheckin(
  zupassServerUrl: string,
  pipelineId: string,
  ticketId: string,
  jwt: string
): Promise<PodboxDeleteOfflineCheckinResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/delete-offline-checkin"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as PodboxDeleteOfflineCheckinResponseValue
      };
    },
    {
      pipelineId,
      ticketId,
      jwt
    } satisfies PodboxDeleteOfflineCheckinRequest
  );
}

export type PodboxDeleteOfflineCheckinResult =
  APIResult<PodboxDeleteOfflineCheckinResponseValue>;
