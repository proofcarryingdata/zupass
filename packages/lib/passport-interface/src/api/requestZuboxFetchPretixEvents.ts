import urlJoin from "url-join";
import {
  ZuboxFetchPretixEventsRequest,
  ZuboxFetchPretixEventsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the server to fetch the Pretix events for the given organizer URL and API token.
 */
export async function requestZuboxFetchPretixEvents(
  zupassServerUrl: string,
  req: ZuboxFetchPretixEventsRequest
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
  APIResult<ZuboxFetchPretixEventsResponseValue>;
