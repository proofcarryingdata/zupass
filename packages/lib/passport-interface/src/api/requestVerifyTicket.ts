import urlJoin from "url-join";
import {
  VerifyTicketRequest,
  VerifyTicketResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * By default, the EdDSATicketPCD card contains a QR code which links to a
 * verification screen in the front end. That screen makes this request.
 *
 * Does not apply for Devconnect tickets, which have a custom QR code. This
 * API should not be used for Devconnect tickets.
 *
 * Returns a result which says whether the ticket is verified, and in order
 * to be verified it must be a valid PCD and the ticket must match criteria
 * associated with Zuconnect '23 or Zuzalu '23 tickets. All other ticket
 * types, including Devconnect, will be returned as unverified.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestVerifyTicket(
  passportServerUrl: string,
  postBody: VerifyTicketRequest
): Promise<VerifyTicketResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/verify-ticket"),
    async (resText) => JSON.parse(resText),
    postBody
  );
}

export type VerifyTicketResult = APIResult<VerifyTicketResponseValue>;
