import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  RemoveUserEmailRequest,
  RemoveUserEmailResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Sends a request to the server to delete an email address from a user's account.
 *
 * @param zupassServerUrl The base URL of the Zupass server
 * @param emailToRemove The email address to be deleted from the account
 * @param pcd A semaphore signature from the user, used to verify their identity
 * @returns A promise that resolves to an APIResult containing undefined for success or an error message
 */
export async function deleteUserEmail(
  zupassServerUrl: string,
  emailToRemove: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>
): Promise<DeleteUserEmailResult> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, "/account/delete-email"),
    async (resText) =>
      resText === "OK"
        ? { value: undefined, success: true }
        : { value: undefined, success: false, error: resText },
    {
      emailToRemove,
      pcd
    } satisfies RemoveUserEmailRequest
  );
}

export type DeleteUserEmailResult = APIResult<RemoveUserEmailResponseValue>;
