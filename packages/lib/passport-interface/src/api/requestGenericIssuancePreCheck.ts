import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  ActionConfigResponseValue,
  GenericIssuancePreCheckRequest
} from "../RequestTypes";
import { PodboxTicketAction } from "../TicketAction";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Performs a pre-checkin "check" on a ticket issued by the Generic Issuance
 * Service. {@link credential} is a Semaphore Signature of a payload
 * that is a `JSON.stringify`-ed {@link GenericCheckinCredentialPayload}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestGenericIssuancePreCheck(
  preCheckUrl: string,
  credential: SerializedPCD<SemaphoreSignaturePCD>,
  action: PodboxTicketAction,
  ticketId: string,
  eventId: string
): Promise<PodboxActionPreCheckResult> {
  return httpPostSimple(
    urlJoin(preCheckUrl),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as ActionConfigResponseValue
      };
    },
    {
      credential,
      action,
      ticketId,
      eventId
    } satisfies GenericIssuancePreCheckRequest
  );
}

export type PodboxActionPreCheckResult = APIResult<ActionConfigResponseValue>;
