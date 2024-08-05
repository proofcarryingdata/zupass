import { PollFeedRequest, PollFeedResponseValue } from "../RequestTypes.js";
import { APIResult } from "./apiResult.js";
import { httpPostSimple } from "./makeRequest.js";

/**
 * Asks a feed for new PCDs.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPollFeed(
  url: string,
  req: PollFeedRequest
): Promise<PollFeedResult> {
  return httpPostSimple(
    url,
    async (resText) => ({
      value: JSON.parse(resText) as PollFeedResponseValue,
      success: true
    }),
    req
  );
}

export type PollFeedResult = APIResult<PollFeedResponseValue>;
