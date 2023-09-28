import urlJoin from "url-join";
import { IssuanceEnabledResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the Zupass server whether or not it has feeds that can server
 * responses.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestIssuanceServiceEnabled(
  zupassServerUrl: string
): Promise<IssuanceServiceEnabledResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, "/issue/enabled"),
    async (resText) => ({ value: resText === "true", success: true })
  );
}

export type IssuanceServiceEnabledResult =
  APIResult<IssuanceEnabledResponseValue>;
