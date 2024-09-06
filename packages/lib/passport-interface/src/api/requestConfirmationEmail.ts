import urlJoin from "url-join";
import {
  ConfirmEmailRequest,
  ConfirmEmailResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to send the given email address a confirmation email
 * that contains a token which can be used to login/reset an account.
 *
 * In dev mode, can return the token rather than sending it to the email,
 * to speed up the development loop.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestConfirmationEmail(
  zupassServerUrl: string,
  email: string,
  force: boolean
): Promise<ConfirmEmailResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/send-login-email"),
    async (resText) =>
      resText === "OK"
        ? { value: undefined, success: true }
        : {
            value: JSON.parse(resText) as ConfirmEmailResponseValue,
            success: true
          },
    {
      email,
      force: force ? "true" : "false"
    } satisfies ConfirmEmailRequest
  );
}

export type ConfirmEmailResult = APIResult<ConfirmEmailResponseValue>;
