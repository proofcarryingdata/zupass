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
 * @param zupassServerUrl The base URL of the Zupass server
 * @param currentEmail The user's current primary email address
 * @param newEmail The new email address to be added to the account
 * @param pcd A semaphore signature from the user, used to verify their identity
 * @returns A promise that resolves to an APIResult containing undefined for success or an error message
 */
export async function requestAddUserEmail(
  zupassServerUrl: string,
  newEmail: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>,
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