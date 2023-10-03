import urlJoin from "url-join";
import {
  CheckTicketReponseValue as CheckTicketResponseValue,
  CheckTicketRequest,
  TicketError
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Does NOT check in the user, rather checks whether the ticket is valid and
 * can be used to check in.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckTicket(
  zupassServerUrl: string,
  postBody: CheckTicketRequest,
  jwt: string
): Promise<CheckTicketResult> {
  return httpPost<CheckTicketResult>(
    urlJoin(zupassServerUrl, "/issue/check-ticket"),
    {
      onValue: async (resText) => JSON.parse(resText) as CheckTicketResult,
      onError: async (): Promise<CheckTicketResult> => ({
        error: { name: "ServerError" },
        success: false
      })
    },
    postBody,
    jwt
  );
}

export type CheckTicketResult = APIResult<
  CheckTicketResponseValue,
  TicketError
>;
