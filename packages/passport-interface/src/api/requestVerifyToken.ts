import urlJoin from "url-join";
import { VerifyTokenRequest, VerifyTokenResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to verify the given email login token.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestVerifyToken(
  passportServer: string,
  email: string,
  token: string
): Promise<VerifyTokenResult> {
  return httpPostSimple(
    urlJoin(passportServer, `/pcdpass/verify-token`),
    async (resText) =>
      ({
        value: JSON.parse(resText),
        success: true
      }) as VerifyTokenResult,
    { email, token } satisfies VerifyTokenRequest
  );
}

export type VerifyTokenResult = APIResult<VerifyTokenResponseValue>;
