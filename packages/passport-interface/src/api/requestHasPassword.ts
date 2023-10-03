import urlJoin from "url-join";
import { HasPasswordRequest, HasPasswordResultValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the Zupass server for a JWT.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestHasPassword(
  zupassServerUrl: string,
  email: string
): Promise<RequestJWTResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/get-token"),
    async (resText) => ({
      value: JSON.parse(resText) as HasPasswordResultValue,
      success: true
    }),
    {
      email
    } satisfies HasPasswordRequest
  );
}

export type RequestJWTResult = APIResult<HasPasswordResultValue>;
