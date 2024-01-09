import urlJoin from "url-join";
import {
  VerifyTicketByIdRequest,
  VerifyTicketByIdResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Similar to {@link requestVerifyTicket}, but instead of taking a whole PCD,
 * instead takes a ticket ID and a timestamp, and uses server-side lookup to
 * provide information about the PCD.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestVerifyTicketById(
  passportServerUrl: string,
  postBody: VerifyTicketByIdRequest
): Promise<VerifyTicketByIdResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/verify-ticket-by-id"),
    async (resText) => JSON.parse(resText),
    postBody
  );
}

export type VerifyTicketByIdResult = APIResult<VerifyTicketByIdResponseValue>;
