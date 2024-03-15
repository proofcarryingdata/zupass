import urlJoin from "url-join";
import { ZuboxSelfRequest, ZuboxSelfResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to get information about the currently logged in user.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxSelf(
  zupassServerUrl: string,
  jwt: string
): Promise<ZuboxSelfResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/generic-issuance/api/self"),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as ZuboxSelfResponseValue
      };
    },
    {
      jwt
    } satisfies ZuboxSelfRequest
  );
}

export type ZuboxSelfResult = APIResult<ZuboxSelfResponseValue>;
