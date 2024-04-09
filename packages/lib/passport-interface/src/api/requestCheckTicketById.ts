import urlJoin from "url-join";
import {
  CheckTicketByIdRequest,
  CheckTicketByIdResponseValue,
  TicketError
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * For Devconnect tickets, pre-check a ticket before attempting check-in.
 *
 * Sends only the ticket ID. See {@link requestCheckTicket} for an
 * alternative API which sends a serialized PCD.
 *
 * Does NOT check in the user, rather checks whether the ticket is valid and
 * can be used to check in.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckTicketById(
  passportServerUrl: string,
  postBody: CheckTicketByIdRequest
): Promise<CheckTicketByIdResult> {
  return httpPost<CheckTicketByIdResult>(
    urlJoin(passportServerUrl, "/issue/check-ticket-by-id"),
    {
      onValue: async (resText) => JSON.parse(resText) as CheckTicketByIdResult,
      onError: async (): Promise<CheckTicketByIdResult> => ({
        error: { name: "ServerError" },
        success: false
      })
    },
    postBody
  );
}

export type CheckTicketByIdResult = APIResult<
  CheckTicketByIdResponseValue,
  TicketError
>;
