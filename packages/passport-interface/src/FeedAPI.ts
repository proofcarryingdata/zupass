import { PCDPackage } from "@pcd/pcd-types";
import { ListFeedsResult, requestListFeeds } from "./api/requestListFeeds";
import { PollFeedResult, requestPollFeed } from "./api/requestPollFeed";
import { PollFeedRequest } from "./RequestTypes";

export interface IFeedApi {
  pollFeed(
    providerUrl: string,
    request: PollFeedRequest
  ): Promise<PollFeedResult>;
  listFeeds(providerUrl: string): Promise<ListFeedsResult>;
}

export class NetworkFeedApi implements IFeedApi {
  public async pollFeed<T extends PCDPackage>(
    providerUrl: string,
    request: PollFeedRequest<T>
  ): Promise<PollFeedResult> {
    return requestPollFeed(providerUrl, request);
  }

  public async listFeeds(providerUrl: string): Promise<ListFeedsResult> {
    return requestListFeeds(providerUrl);
  }
}
