import { ListFeedsResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpGetSimple } from "./makeRequest";

/**
 * Asks a feed provider for the list of feeds that they are hosting.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestListFeeds(url: string): Promise<ListFeedsResult> {
  return httpGetSimple(url, async (resText) => ({
    value: JSON.parse(resText) as ListFeedsResponseValue,
    success: true
  }));
}

export type ListFeedsResult = APIResult<ListFeedsResponseValue>;
