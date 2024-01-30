import { SerializedPCD } from "@pcd/pcd-types";
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
  signatureOnTicket: SerializedPCD
): Promise<GenericIssuanceCheckInResult> {
  return httpPostSimple(
    urlJoin(checkinUrl),
    async (resText) =>
      ({
        value: JSON.parse(resText),
        success: true
      }) as GenericIssuanceCheckInResult,
    { pcd: signatureOnTicket } satisfies GenericIssuanceCheckInRequest
  );
}

export type GenericIssuanceCheckInResult =
  APIResult<GenericIssuanceCheckInResponseValue>;
