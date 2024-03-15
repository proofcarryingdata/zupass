import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  ActionConfigResponseValue,
  GenericIssuancePreCheckRequest
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Performs a pre-checkin "check" on a ticket issued by Zubox.
 * {@link signedPayload} is a Semaphore Signature of a payload
 * that is a `JSON.stringify`-ed {@link GenericCheckinCredentialPayload}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestZuboxPreCheck(
  preCheckUrl: string,
  signedPayload: SerializedPCD<SemaphoreSignaturePCD>
): Promise<ZuboxActionPreCheckResult> {
  return httpPostSimple(
    urlJoin(preCheckUrl),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as ActionConfigResponseValue
      };
    },
    {
      credential: signedPayload
    } satisfies GenericIssuancePreCheckRequest
  );
}

export type ZuboxActionPreCheckResult = APIResult<ActionConfigResponseValue>;
