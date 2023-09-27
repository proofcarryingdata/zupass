import urlJoin from "url-join";
import {
  VerifyTicketRequest,
  VerifyTicketResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Provides two levels of verification for tickets. The first simply ensures
 * that the ticket PCD is valid. The second compares the ticket against a
 * list of known ticket types and public keys, allowing a more detailed
 * response for tickets of a recognized type.
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
