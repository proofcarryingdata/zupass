import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import urlJoin from "url-join";
import {
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue
} from "../RequestTypes";
import { PodboxTicketAction } from "../TicketAction";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to checkIn in a ticket issued by the Generic Issuance
 * Service. {@link credential} is a Semaphore Signature of a payload
 * that is a `JSON.stringify`-ed {@link CredentialPayload}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPodboxTicketAction(
  checkInUrl: string,
  credential: SerializedPCD<SemaphoreSignaturePCD>,
  action: PodboxTicketAction,
  ticketId: string,
  eventId: string
): Promise<PodboxTicketActionResult> {
  return httpPostSimple(
    urlJoin(checkInUrl),
    async (resText) => {
      return {
        success: true,
        value: JSON.parse(resText) as PodboxTicketActionResponseValue
      };
    },
    {
      credential,
      action,
      ticketId,
      eventId
    } satisfies PodboxTicketActionRequest
  );
}

export type PodboxTicketActionResult =
  APIResult<PodboxTicketActionResponseValue>;
