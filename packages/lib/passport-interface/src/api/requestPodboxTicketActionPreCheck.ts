import urlJoin from "url-join";
import { Credential } from "../Credential";
import {
  ActionConfigResponseValue,
  PodboxTicketActionPreCheckRequest
} from "../RequestTypes";
import { PodboxTicketAction } from "../TicketAction";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Prior to performing an action such as check-in on a ticket, retrieve a list
 * of supported actions, if any. If the credential does not authorize the
 * performance of actions on this ticket, the return value will indicate this.
 *
 * {@link credential} is a Semaphore Signature of a payload that is a
 * `JSON.stringify`-ed {@link CredentialPayload}.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPodboxTicketActionPreCheck(
  preCheckUrl: string,
  credential: Credential,
  action: PodboxTicketAction,
  ticketId: string,
  eventId: string
): Promise<PodboxTicketActionPreCheckResult> {
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
    } satisfies PodboxTicketActionPreCheckRequest
  );
}

export type PodboxTicketActionPreCheckResult =
  APIResult<ActionConfigResponseValue>;
