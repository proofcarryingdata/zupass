import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  ChangeUserEmailRequest,
  ChangeUserEmailResponseValue,
  EmailUpdateError
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Sends a request to the server to change the single email associated
 * with their account to another email address.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestChangeUserEmail(
  zupassServerUrl: string,
  oldEmail: string,
  newEmail: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>,
  /**
   * If absent, requests a confirmation code; if present redeems it and performs the update.
   */
  confirmationCode?: string
): Promise<ChangeUserEmailResult> {
  return httpPost<ChangeUserEmailResult>(
    urlJoin(zupassServerUrl, "/account/change-email"),
    {
      onValue: async (resText) => ({
        value: JSON.parse(resText),
        success: true
      }),
      onError: async (resText, code) => ({
        error: resText as EmailUpdateError,
        success: false,
        code
      })
    },
    {
      oldEmail,
      newEmail,
      pcd,
      confirmationCode
    } satisfies ChangeUserEmailRequest
  );
}

export type ChangeUserEmailResult = APIResult<
  ChangeUserEmailResponseValue,
  EmailUpdateError
>;
