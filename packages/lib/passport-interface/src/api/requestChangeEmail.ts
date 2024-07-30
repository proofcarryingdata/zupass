import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  ChangeUserEmailRequest,
  ChangeUserEmailResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Sends a request to the server to change a user's email address.
 *
 * @param zupassServerUrl The base URL of the Zupass server
 * @param currentEmail The user's current email address
 * @param newEmail The new email address the user wants to change to
 * @param pcd A semaphore signature from the user, used to verify their identity
 * @param confirmationCode An optional confirmation code for additional verification
 * @returns A promise that resolves to an APIResult containing undefined for success or an error message
 */
export async function changeUserEmail(
  zupassServerUrl: string,
  currentEmail: string,
  newEmail: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>,
  confirmationCode?: string
): Promise<ChangeUserEmailResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/change-email"),
    async (resText) => ({ value: JSON.parse(resText), success: true }),
    {
      currentEmail,
      newEmail,
      pcd,
      confirmationCode
    } satisfies ChangeUserEmailRequest
  );
}

export type ChangeUserEmailResult = APIResult<ChangeUserEmailResponseValue>;
