import urlJoin from "url-join";
import {
  CheckTicketInByIdError,
  CheckTicketInByIdRequest,
  CheckTicketInByIdResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Tries to check the user in. This is called by the Zupass client when
 * a 'superuser' of a particular event wants to check in a Devconnect
 * attendee into the event.
 *
 * Sends the ticket ID. See {@link requestCheckIn} for an alternative
 * API which sends a serialized PCD.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckInById(
  passportServerUrl: string,
  postBody: CheckTicketInByIdRequest
): Promise<CheckTicketInByIdResult> {
  return httpPost<CheckTicketInByIdResult>(
    urlJoin(passportServerUrl, "/issue/check-in-by-id"),
    {
      // @todo - here and elsewhere - how can we do better than casting, and actually
      // make sure that the response we're getting back is the right shape?
      onValue: async (resText) =>
        JSON.parse(resText) as CheckTicketInByIdResult,
      onError: async () => ({ error: { name: "ServerError" }, success: false })
    },
    postBody
  );
}

export type CheckTicketInByIdResult = APIResult<
  CheckTicketInByIdResponseValue,
  CheckTicketInByIdError
>;
