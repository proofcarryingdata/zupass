import urlJoin from "url-join";
import {
  UploadOfflineCheckinsRequest,
  UploadOfflineCheckinsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestOfflineTicketsCheckin(
  passportServerUrl: string,
  postBody: UploadOfflineCheckinsRequest
): Promise<OfflineTicketsCheckinResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/checkin-offline-tickets"),
    async (resText) => ({
      success: true,
      value: JSON.parse(resText) as UploadOfflineCheckinsResponseValue
    }),
    postBody
  );
}

export type OfflineTicketsCheckinResult =
  APIResult<UploadOfflineCheckinsResponseValue>;
