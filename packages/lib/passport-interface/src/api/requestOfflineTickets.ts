import urlJoin from "url-join";
import {
  GetOfflineTicketsRequest,
  GetOfflineTicketsResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestOfflineTickets(
  passportServerUrl: string,
  postBody: GetOfflineTicketsRequest
): Promise<OfflineTicketsResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/offline-tickets"),
    async (resText) => ({
      success: true,
      value: JSON.parse(resText) as GetOfflineTicketsResponseValue
    }),
    postBody
  );
}

export type OfflineTicketsResult = APIResult<GetOfflineTicketsResponseValue>;
