import {
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "./RequestTypes";
import { Feed } from "./SubscriptionManager";

export interface HostedFeed {
  feed: Feed;
  handleRequest(request: PollFeedRequest): Promise<PollFeedResponseValue>;
}

export class FeedHost {
  private readonly hostedFeed: HostedFeed[];

  public constructor(feeds: HostedFeed[]) {
    this.hostedFeed = feeds;
  }

  public async handleFeedRequest(
    request: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    const feed = this.hostedFeed.find((f) => f.feed.id === request.feedId);
    if (!feed) {
      throw new Error(`couldn't find feed with id ${request.feedId}`);
    }

    const response = await feed.handleRequest(request);
    return response;
  }

  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      feeds: this.hostedFeed.map((f) => f.feed)
    };
  }
}
