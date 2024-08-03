import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  EmailUpdateError,
  RemoveUserEmailRequest,
  RemoveUserEmailResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Sends a request to the server to remove an email address from being
 * associated with their Zupass account.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestRemoveUserEmail(
  zupassServerUrl: string,
  emailToRemove: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>
): Promise<RemoveUserEmailResult> {
  return httpPost<RemoveUserEmailResult>(
    urlJoin(zupassServerUrl, "/account/delete-email"),
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
      emailToRemove,
      pcd
    } satisfies RemoveUserEmailRequest
  );
}

export type RemoveUserEmailResult = APIResult<
  RemoveUserEmailResponseValue,
  EmailUpdateError
>;
