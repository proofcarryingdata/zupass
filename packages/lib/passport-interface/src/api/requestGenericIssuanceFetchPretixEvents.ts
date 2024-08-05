import urlJoin from "url-join";
import {
  GenericIssuanceFetchPretixEventsRequest,
  GenericIssuanceFetchPretixEventsResponseValue
} from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks the server to fetch the Pretix events for the given organizer URL and API token.
 */
export async function requestGenericIssuanceFetchPretixEvents(
  zupassServerUrl: string,
  req: GenericIssuanceFetchPretixEventsRequest
): Promise<GenericIssuanceFetchPretixEventsResponse> {
  return httpPostSimple(
    urlJoin(zupassServerUrl, `/generic-issuance/api/fetch-pretix-events`),
    async (resText) => ({
      value: JSON.parse(resText),
      success: true
    }),
    req,
    true
  );
}

export type GenericIssuanceFetchPretixEventsResponse =
  APIResult<GenericIssuanceFetchPretixEventsResponseValue>;
