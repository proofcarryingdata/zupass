import { PollFeedRequest } from "./RequestTypes.js";
import { ListFeedsResult, requestListFeeds } from "./api/requestListFeeds.js";
import { PollFeedResult, requestPollFeed } from "./api/requestPollFeed.js";

export interface IFeedApi {
  pollFeed(
    providerUrl: string,
    request: PollFeedRequest
  ): Promise<PollFeedResult>;
  listFeeds(providerUrl: string): Promise<ListFeedsResult>;
}

export class NetworkFeedApi implements IFeedApi {
  public async pollFeed(
    providerUrl: string,
    request: PollFeedRequest
  ): Promise<PollFeedResult> {
    return requestPollFeed(providerUrl, request);
  }

  public async listFeeds(providerUrl: string): Promise<ListFeedsResult> {
    return requestListFeeds(providerUrl);
  }
}
