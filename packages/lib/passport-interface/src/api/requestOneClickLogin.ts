import urlJoin from "url-join";
import { OneClickLoginRequest, UserResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * This function allows a user to log in with a one-click login process.
 * It sends the necessary data to the backend and handles the response.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestOneClickLogin(
  zupassServerUrl: string,
  email: string,
  code: string,
  commitment: string,
  encryptionKey: string
): Promise<LoginResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/one-click-login"),
    async (resText) => ({
      value: JSON.parse(resText) as UserResponseValue,
      success: true
    }),
    {
      email,
      code,
      commitment,
      encryptionKey
    } satisfies OneClickLoginRequest
  );
}

export type LoginResult = APIResult<UserResponseValue>;
