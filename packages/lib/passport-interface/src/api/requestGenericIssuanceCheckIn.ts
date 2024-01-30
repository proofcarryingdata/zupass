import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to verify the given email login token.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuanceCheckin(
  checkinUrl: string,
  signedPayload: SerializedPCD<SemaphoreSignaturePCD>
): Promise<GenericIssuanceCheckInResult> {
  return httpPostSimple(
    urlJoin(checkinUrl),
    async () =>
      ({
        value: undefined,
        success: true
      }) as GenericIssuanceCheckInResult,
    {
      credential: signedPayload
    } satisfies GenericIssuanceCheckInRequest
  );
}

export type GenericIssuanceCheckInResult =
  APIResult<GenericIssuanceCheckInResponseValue>;
