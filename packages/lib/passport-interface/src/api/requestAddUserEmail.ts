import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  AddUserEmailRequest,
  AddUserEmailResponseValue,
  EmailUpdateError
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Sends a request to the server to add a new email address to a user's account.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestAddUserEmail(
  zupassServerUrl: string,
  newEmail: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>,
  /**
   * If absent, requests a confirmation code; if present redeems it and performs the update.
   */
  confirmationCode?: string
): Promise<AddUserEmailResult> {
  return httpPost<AddUserEmailResult>(
    urlJoin(zupassServerUrl, "/account/add-email"),
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
      newEmail,
      pcd,
      confirmationCode
    } satisfies AddUserEmailRequest
  );
}

export type AddUserEmailResult = APIResult<
  AddUserEmailResponseValue,
  EmailUpdateError
>;
