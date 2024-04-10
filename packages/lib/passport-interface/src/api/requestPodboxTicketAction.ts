import urlJoin from "url-join";
import {
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue
} from "../RequestTypes";
import { PodboxTicketAction } from "../TicketAction";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to perform an action in relation to a ticket issued by
 * Podbox, such as check-in or badge gifting.
 * {@link credential} is a Semaphore Signature of a payload
 * that is a `JSON.stringify`-ed {@link CredentialPayload}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPodboxTicketAction(
  checkInUrl: string,
  credential: Credential,
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
