import urlJoin from "url-join";
import { Credential } from "../Credential";
import {
  PodboxCheckInOfflineTicketsRequest,
  PodboxCheckInOfflineTicketsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Checks in offline tickets.
 */
export async function requestPodboxCheckInOfflineTickets(
  zupassServerUrl: string,
  credential: Credential,
  ticketsByEventId: Record<string, string[]> // eventID -> ticketID[]
): Promise<PodboxCheckinOfflineTicketsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/checkin-offline-tickets"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as PodboxCheckInOfflineTicketsResponseValue
      };
    },
    {
      credential,
      tickets: ticketsByEventId
    } satisfies PodboxCheckInOfflineTicketsRequest
  );
}

export type PodboxCheckinOfflineTicketsResult =
  APIResult<PodboxCheckInOfflineTicketsResponseValue>;
