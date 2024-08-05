import urlJoin from "url-join";
import { KnownTicketTypesResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpGetSimple } from "./makeRequest.js";

/**
 * Asks the server for a list of known ticket types.
 */
export async function requestKnownTicketTypes(
  zupassServerUrl: string
): Promise<KnownTicketTypesResult> {
  return httpGetSimple(
    urlJoin(zupassServerUrl, `/issue/known-ticket-types`),
    async (resText) => JSON.parse(resText)
  );
}

export type KnownTicketTypesResult = APIResult<KnownTicketTypesResponseValue>;
