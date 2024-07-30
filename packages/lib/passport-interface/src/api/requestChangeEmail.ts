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

export async function changeUserEmail(
  zupassServerUrl: string,
  currentEmail: string,
  newEmail: string,
  pcd: SerializedPCD<SemaphoreSignaturePCD>,
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
      currentEmail,
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
