import urlJoin from "url-join";
import { SaltRequest, SaltResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks the server for the password salt of a particular email address.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPasswordSalt(
  passportServerUrl: string,
  email: string
): Promise<PasswordSaltResponse> {
  return httpGetSimple(
    urlJoin(
      passportServerUrl,
      `/pcdpass/salt?${new URLSearchParams({
        email
      } satisfies SaltRequest).toString()}`
    ),
    async (resText) => ({
      value: resText,
      success: true
    })
  );
}

export type PasswordSaltResponse = APIResult<SaltResponseValue>;
