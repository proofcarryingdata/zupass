import urlJoin from "url-join";
import { Credential } from "../Credential";
import {
  PodboxGetOfflineTicketsRequest,
  PodboxGetOfflineTicketsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Returns any offline tickets that the user has access to check in.
 */
export async function requestPodboxGetOfflineTickets(
  zupassServerUrl: string,
  credential: Credential
): Promise<PodboxGetOfflineTicketsResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/offline-tickets"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as PodboxGetOfflineTicketsResponseValue
      };
    },
    {
      credential
    } satisfies PodboxGetOfflineTicketsRequest
  );
}

export type PodboxGetOfflineTicketsResult =
  APIResult<PodboxGetOfflineTicketsResponseValue>;
