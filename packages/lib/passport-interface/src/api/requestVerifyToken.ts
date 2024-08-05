import urlJoin from "url-join";
import {
  VerifyTokenRequest,
  VerifyTokenResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to verify the given email login token.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestVerifyToken(
  zupassServerUrl: string,
  email: string,
  token: string
): Promise<VerifyTokenResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/account/verify-token`),
    async (resText) =>
      ({
        value: JSON.parse(resText),
        success: true
      }) as VerifyTokenResult,
    { email, token } satisfies VerifyTokenRequest
  );
}

export type VerifyTokenResult = APIResult<VerifyTokenResponseValue>;
